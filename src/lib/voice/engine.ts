/**
 * Motor de chamada em malha (mesh) WebRTC, sem dependência de React ou Supabase.
 *
 * Cada par de participantes tem UMA RTCPeerConnection com três transceivers fixos,
 * sempre na mesma ordem:
 *   0 → áudio do microfone
 *   1 → vídeo da tela compartilhada
 *   2 → áudio da tela compartilhada (som da aba/sistema)
 *
 * Como os transceivers são negociados uma única vez, ligar/desligar o microfone ou o
 * compartilhamento de tela é só `replaceTrack` — não há renegociação, e por isso não
 * existe colisão de ofertas. Quem cria a oferta é sempre o participante com o menor id
 * (iniciador); o outro só responde.
 */

export type Signal =
  | { kind: 'offer' | 'answer'; from: string; to: string; session: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'candidates'; from: string; to: string; session: string; candidates: RTCIceCandidateInit[] }
  | { kind: 'hello'; from: string; to: string };

export type PeerStatus = 'connecting' | 'connected' | 'reconnecting' | 'failed';

export type EngineSnapshot = {
  /** Vídeo de tela recebido de cada participante (por peerId). */
  videos: Record<string, MediaStream>;
  /** peerIds falando agora (inclui o próprio id). */
  speaking: string[];
  /** Estado da conexão com cada participante. */
  status: Record<string, PeerStatus>;
  /** O navegador bloqueou a reprodução automática do áudio. */
  audioBlocked: boolean;
};

export type EngineOptions = {
  selfId: string;
  iceServers: RTCIceServer[];
  send: (signal: Signal) => void;
  onChange: (snapshot: EngineSnapshot) => void;
  onPeerFailed?: (peerId: string, reason?: string) => void;
};

type Role = 'mic' | 'screen' | 'screenAudio';
const ROLES: Role[] = ['mic', 'screen', 'screenAudio'];
type Timer = ReturnType<typeof setTimeout>;

type Peer = {
  id: string;
  session: string;
  initiator: boolean;
  pc: RTCPeerConnection;
  tx: Partial<Record<Role, RTCRtpTransceiver>>;
  pendingRemote: RTCIceCandidateInit[];
  outbox: RTCIceCandidateInit[];
  flushTimer?: Timer;
  answerTimer?: Timer;
  disconnectTimer?: Timer;
  connectTimer?: Timer;
  restarts: number;
  queue: Promise<void>;
  audio: Partial<Record<'mic' | 'screenAudio', HTMLAudioElement>>;
  closed: boolean;
};

type Meter = { analyser: AnalyserNode; source: MediaStreamAudioSourceNode; buffer: Float32Array<ArrayBuffer>; lastLoud: number };

const SPEAKING_THRESHOLD = 0.012;
const SPEAKING_HOLD_MS = 350;
const ANSWER_TIMEOUT_MS = 10_000;
const CONNECT_TIMEOUT_MS = 20_000;
const HELLO_DELAY_MS = 5_000;
const MAX_RECREATIONS = 4;

const newSession = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export class VoiceEngine {
  private peers = new Map<string, Peer>();
  private mic: MediaStream | null = null;
  private display: MediaStream | null = null;
  private muted = false;
  private deafened = false;
  private volumes = new Map<string, number>();
  private sinkId = '';
  private audioRoot: HTMLDivElement;
  private ctx: AudioContext | null = null;
  private meters = new Map<string, Meter>();
  private meterTimer: ReturnType<typeof setInterval> | null = null;
  private helloTimers = new Map<string, Timer>();
  private helloAttempts = new Map<string, number>();
  private recreations = new Map<string, number>();
  private earlyCandidates = new Map<string, RTCIceCandidateInit[]>();
  private known = new Set<string>();
  private destroyed = false;
  private snapshot: EngineSnapshot = { videos: {}, speaking: [], status: {}, audioBlocked: false };

  constructor(private readonly opts: EngineOptions) {
    this.audioRoot = document.createElement('div');
    this.audioRoot.dataset['voiceAudio'] = '';
    this.audioRoot.style.display = 'none';
    document.body.appendChild(this.audioRoot);
    this.meterTimer = setInterval(() => this.measure(), 120);
  }

  get id() {
    return this.opts.selfId;
  }

  // ───────────────────────────── API pública ─────────────────────────────

  /** Lista atual de participantes da sala (vinda da presença). */
  syncPeers(ids: string[]) {
    if (this.destroyed) return;
    const self = this.opts.selfId;
    const next = new Set(ids.filter((id) => id !== self));
    for (const id of this.known) {
      if (!next.has(id)) {
        this.helloAttempts.delete(id);
        this.recreations.delete(id);
        const status = { ...this.snapshot.status };
        delete status[id];
        this.update({ status });
      }
    }
    this.known = next;
    for (const id of [...this.peers.keys()]) if (!next.has(id)) this.closePeer(id, true);
    for (const id of [...this.helloTimers.keys()]) if (!next.has(id)) this.clearHello(id);
    for (const id of next) {
      if (this.peers.has(id) || this.snapshot.status[id] === 'failed') continue;
      if (this.isInitiator(id)) this.startPeer(id);
      else this.scheduleHello(id);
    }
  }

  handleSignal(signal: Signal) {
    if (this.destroyed || signal.to !== this.opts.selfId || signal.from === this.opts.selfId) return;
    const from = signal.from;
    if (signal.kind === 'hello') {
      if (!this.isInitiator(from)) return;
      const peer = this.peers.get(from);
      if (!peer) this.recreate(from);
      else if (peer.pc.connectionState === 'failed' || peer.pc.connectionState === 'disconnected') this.recreate(from);
      return;
    }
    if (signal.kind === 'offer') {
      if (this.isInitiator(from)) return;
      this.clearHello(from);
      this.helloAttempts.delete(from);
      let peer = this.peers.get(from);
      if (!peer || peer.session !== signal.session) {
        if (peer) this.closePeer(from, false);
        peer = this.createPeer(from, signal.session, false);
        const key = `${from}|${signal.session}`;
        peer.pendingRemote.push(...(this.earlyCandidates.get(key) ?? []));
        this.earlyCandidates.delete(key);
      }
      const p = peer;
      this.watchConnection(p);
      this.enqueue(p, async () => {
        await p.pc.setRemoteDescription(signal.sdp);
        if (!p.tx.mic) await this.bindAnswererTransceivers(p);
        await this.flushRemoteCandidates(p);
        await p.pc.setLocalDescription(await p.pc.createAnswer());
        const local = p.pc.localDescription;
        if (local) this.opts.send({ kind: 'answer', from: this.opts.selfId, to: from, session: p.session, sdp: local.toJSON() });
      });
      return;
    }
    if (signal.kind === 'answer') {
      const p = this.peers.get(from);
      if (!p || !p.initiator || p.session !== signal.session) return;
      this.enqueue(p, async () => {
        if (p.pc.signalingState !== 'have-local-offer') return;
        await p.pc.setRemoteDescription(signal.sdp);
        if (p.answerTimer) clearTimeout(p.answerTimer);
        this.watchConnection(p);
        await this.flushRemoteCandidates(p);
      });
      return;
    }
    if (signal.kind === 'candidates') {
      const p = this.peers.get(from);
      if (!p || p.session !== signal.session) {
        if (!this.isInitiator(from)) {
          const key = `${from}|${signal.session}`;
          this.earlyCandidates.set(key, [...(this.earlyCandidates.get(key) ?? []), ...signal.candidates].slice(-60));
        }
        return;
      }
      this.enqueue(p, async () => {
        if (!p.pc.remoteDescription) {
          p.pendingRemote.push(...signal.candidates);
          return;
        }
        for (const c of signal.candidates) await p.pc.addIceCandidate(c).catch(() => undefined);
      });
    }
  }

  setMic(stream: MediaStream | null) {
    if (this.destroyed) return;
    this.mic = stream;
    const track = stream?.getAudioTracks()[0] ?? null;
    if (track) track.enabled = !this.muted;
    for (const p of this.peers.values()) {
      const sender = p.tx.mic?.sender;
      if (!sender) continue;
      void sender.replaceTrack(track).catch(() => undefined);
      if (stream && 'setStreams' in sender) sender.setStreams(stream);
    }
    this.removeMeter(this.opts.selfId);
    if (stream && track) this.addMeter(this.opts.selfId, stream);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.mic?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }

  setDisplay(stream: MediaStream | null) {
    if (this.destroyed) return;
    this.display = stream;
    for (const p of this.peers.values()) this.enqueue(p, () => this.attachDisplay(p));
  }

  setDeafened(deafened: boolean) {
    this.deafened = deafened;
    this.forEachAudio((el) => (el.muted = deafened));
  }

  setVolume(peerId: string, volume: number) {
    const v = Math.max(0, Math.min(1, volume));
    this.volumes.set(peerId, v);
    const p = this.peers.get(peerId);
    if (p) Object.values(p.audio).forEach((el) => el && (el.volume = v));
  }

  async setOutputDevice(deviceId: string) {
    this.sinkId = deviceId;
    const jobs: Promise<unknown>[] = [];
    this.forEachAudio((el) => {
      if ('setSinkId' in el) jobs.push((el as HTMLAudioElement & { setSinkId(id: string): Promise<void> }).setSinkId(deviceId).catch(() => undefined));
    });
    await Promise.all(jobs);
  }

  /** Chamar a partir de um clique quando `audioBlocked` for true. */
  async resumeAudio() {
    await this.ctx?.resume().catch(() => undefined);
    const plays: Promise<unknown>[] = [];
    this.forEachAudio((el) => plays.push(el.play().catch(() => Promise.reject())));
    const ok = await Promise.allSettled(plays).then((r) => r.every((x) => x.status === 'fulfilled'));
    this.update({ audioBlocked: !ok });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const id of [...this.peers.keys()]) this.closePeer(id, true);
    for (const id of [...this.helloTimers.keys()]) this.clearHello(id);
    if (this.meterTimer) clearInterval(this.meterTimer);
    for (const id of [...this.meters.keys()]) this.removeMeter(id);
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.audioRoot.remove();
  }

  // ───────────────────────────── Conexões ─────────────────────────────

  private isInitiator(remoteId: string) {
    return this.opts.selfId < remoteId;
  }

  private startPeer(id: string) {
    if (this.peers.has(id)) this.closePeer(id, false);
    const p = this.createPeer(id, newSession(), true);
    this.sendOffer(p, false);
  }

  private createPeer(id: string, session: string, initiator: boolean): Peer {
    const pc = new RTCPeerConnection({ iceServers: this.opts.iceServers, bundlePolicy: 'max-bundle' });
    const p: Peer = { id, session, initiator, pc, tx: {}, pendingRemote: [], outbox: [], restarts: 0, queue: Promise.resolve(), audio: {}, closed: false };

    if (initiator) {
      const micTrack = this.mic?.getAudioTracks()[0];
      p.tx.mic = pc.addTransceiver(micTrack ?? 'audio', { direction: 'sendrecv', streams: this.mic ? [this.mic] : [] });
      p.tx.screen = pc.addTransceiver('video', { direction: 'sendrecv' });
      p.tx.screenAudio = pc.addTransceiver('audio', { direction: 'sendrecv' });
      this.enqueue(p, () => this.attachDisplay(p));
    }

    pc.ontrack = (e) => this.onTrack(p, e);
    pc.onicecandidate = (e) => {
      if (p.closed) return;
      if (e.candidate) {
        p.outbox.push(e.candidate.toJSON());
        if (!p.flushTimer) p.flushTimer = setTimeout(() => this.flushOutbox(p), 80);
      } else {
        this.flushOutbox(p);
      }
    };
    pc.onconnectionstatechange = () => this.onConnectionState(p);

    this.peers.set(id, p);
    this.setStatus(id, 'connecting');
    return p;
  }

  /** O lado que responde recebe os transceivers da oferta e passa a enviar por eles. */
  private async bindAnswererTransceivers(p: Peer) {
    const list = p.pc.getTransceivers();
    ROLES.forEach((role, i) => {
      const t = list[i];
      if (!t) return;
      t.direction = 'sendrecv';
      p.tx[role] = t;
    });
    const micTrack = this.mic?.getAudioTracks()[0] ?? null;
    const sender = p.tx.mic?.sender;
    if (sender) {
      await sender.replaceTrack(micTrack);
      if (this.mic && 'setStreams' in sender) sender.setStreams(this.mic);
    }
    await this.attachDisplay(p);
  }

  private sendOffer(p: Peer, iceRestart: boolean) {
    this.enqueue(p, async () => {
      if (p.closed) return;
      const offer = await p.pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
      await p.pc.setLocalDescription(offer);
      const local = p.pc.localDescription;
      if (!local) return;
      this.opts.send({ kind: 'offer', from: this.opts.selfId, to: p.id, session: p.session, sdp: local.toJSON() });
      if (p.answerTimer) clearTimeout(p.answerTimer);
      p.answerTimer = setTimeout(() => {
        if (!p.closed && p.pc.signalingState === 'have-local-offer') this.recreate(p.id);
      }, ANSWER_TIMEOUT_MS);
    });
  }

  private recreate(id: string) {
    if (this.destroyed || !this.known.has(id) || this.snapshot.status[id] === 'failed') return;
    const count = (this.recreations.get(id) ?? 0) + 1;
    this.recreations.set(id, count);
    if (count > MAX_RECREATIONS) {
      this.closePeer(id, false);
      this.setStatus(id, 'failed');
      this.opts.onPeerFailed?.(id);
      return;
    }
    this.startPeer(id);
  }

  private onConnectionState(p: Peer) {
    if (p.closed) return;
    const state = p.pc.connectionState;
    if (state === 'connected') {
      if (p.connectTimer) clearTimeout(p.connectTimer);
      if (p.disconnectTimer) clearTimeout(p.disconnectTimer);
      p.restarts = 0;
      this.recreations.set(p.id, 0);
      this.setStatus(p.id, 'connected');
      if (this.display) this.tuneScreenSender(p);
    } else if (state === 'disconnected') {
      this.setStatus(p.id, 'reconnecting');
      if (p.initiator) {
        if (p.disconnectTimer) clearTimeout(p.disconnectTimer);
        p.disconnectTimer = setTimeout(() => {
          if (!p.closed && p.pc.connectionState === 'disconnected') this.restartIce(p);
        }, 3000);
      }
    } else if (state === 'failed') {
      this.setStatus(p.id, 'reconnecting');
      if (p.initiator) this.restartIce(p);
      else this.scheduleHello(p.id, 6000);
    }
  }

  private restartIce(p: Peer) {
    if (p.restarts >= 2) {
      this.recreate(p.id);
      return;
    }
    p.restarts++;
    this.sendOffer(p, true);
  }

  /** An SDP answer does not mean ICE found a usable network route. */
  private watchConnection(p: Peer) {
    if (p.connectTimer) clearTimeout(p.connectTimer);
    if (p.closed || p.pc.connectionState === 'connected') return;
    p.connectTimer = setTimeout(() => {
      if (p.closed || p.pc.connectionState === 'connected') return;
      if (p.initiator) this.restartIce(p);
      else {
        this.setStatus(p.id, 'reconnecting');
        this.scheduleHello(p.id, 0);
      }
    }, CONNECT_TIMEOUT_MS);
  }

  private scheduleHello(id: string, delay = HELLO_DELAY_MS) {
    if (this.helloTimers.has(id)) return;
    this.helloTimers.set(
      id,
      setTimeout(() => {
        this.helloTimers.delete(id);
        if (this.destroyed || !this.known.has(id)) return;
        if (this.snapshot.status[id] === 'failed') return;
        const p = this.peers.get(id);
        if (!p || p.pc.connectionState !== 'connected') {
          const attempts = (this.helloAttempts.get(id) ?? 0) + 1;
          this.helloAttempts.set(id, attempts);
          if (attempts > MAX_RECREATIONS) {
            this.closePeer(id, false);
            this.setStatus(id, 'failed');
            this.opts.onPeerFailed?.(id, 'O outro participante não completou a conexão. Saia e entre novamente na sala nos dois dispositivos.');
            return;
          }
          this.opts.send({ kind: 'hello', from: this.opts.selfId, to: id });
          this.scheduleHello(id, HELLO_DELAY_MS);
        }
      }, delay),
    );
  }

  private clearHello(id: string) {
    const t = this.helloTimers.get(id);
    if (t) clearTimeout(t);
    this.helloTimers.delete(id);
  }

  private flushOutbox(p: Peer) {
    if (p.flushTimer) clearTimeout(p.flushTimer);
    delete p.flushTimer;
    if (!p.outbox.length || p.closed) return;
    const candidates = p.outbox.splice(0);
    this.opts.send({ kind: 'candidates', from: this.opts.selfId, to: p.id, session: p.session, candidates });
  }

  private async flushRemoteCandidates(p: Peer) {
    const list = p.pendingRemote.splice(0);
    for (const c of list) await p.pc.addIceCandidate(c).catch(() => undefined);
  }

  private enqueue(p: Peer, job: () => Promise<void>) {
    p.queue = p.queue.then(async () => { if (!p.closed) await job(); }).catch((err) => {
      if (p.closed) return;
      console.error('[voz] falha na negociação com', p.id, err);
      this.closePeer(p.id, false);
      this.setStatus(p.id, 'failed');
      this.opts.onPeerFailed?.(p.id, `Falha ao preparar áudio/tela: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  private closePeer(id: string, forget: boolean) {
    const p = this.peers.get(id);
    if (!p) return;
    p.closed = true;
    [p.flushTimer, p.answerTimer, p.disconnectTimer, p.connectTimer].forEach((t) => t && clearTimeout(t));
    p.pc.ontrack = null;
    p.pc.onicecandidate = null;
    p.pc.onconnectionstatechange = null;
    p.pc.close();
    Object.values(p.audio).forEach((el) => {
      if (!el) return;
      el.pause();
      el.srcObject = null;
      el.remove();
    });
    this.removeMeter(id);
    this.peers.delete(id);
    const videos = { ...this.snapshot.videos };
    delete videos[id];
    const status = { ...this.snapshot.status };
    if (forget) {
      delete status[id];
      this.recreations.delete(id);
    }
    this.update({ videos, status, speaking: this.snapshot.speaking.filter((s) => s !== id) });
  }

  // ───────────────────────────── Mídia ─────────────────────────────

  private onTrack(p: Peer, e: RTCTrackEvent) {
    const role = ROLES[p.pc.getTransceivers().indexOf(e.transceiver)];
    if (!role) return;
    const stream = new MediaStream([e.track]);
    if (role === 'screen') {
      this.update({ videos: { ...this.snapshot.videos, [p.id]: stream } });
      return;
    }
    const old = p.audio[role];
    if (old) {
      old.pause();
      old.remove();
    }
    const el = document.createElement('audio');
    el.autoplay = true;
    el.srcObject = stream;
    el.muted = this.deafened;
    el.volume = this.volumes.get(p.id) ?? 1;
    if (this.sinkId && 'setSinkId' in el) void (el as HTMLAudioElement & { setSinkId(id: string): Promise<void> }).setSinkId(this.sinkId).catch(() => undefined);
    this.audioRoot.appendChild(el);
    p.audio[role] = el;
    void el.play().catch(() => this.update({ audioBlocked: true }));
    if (role === 'mic') this.addMeter(p.id, stream);
  }

  private async attachDisplay(p: Peer) {
    const video = this.display?.getVideoTracks()[0] ?? null;
    const audio = this.display?.getAudioTracks()[0] ?? null;
    await Promise.all([
      p.tx.screen?.sender.replaceTrack(video),
      p.tx.screenAudio?.sender.replaceTrack(audio),
    ]);
    if (video) this.tuneScreenSender(p);
  }

  /** Pede mais qualidade para a tela compartilhada (texto nítido). */
  private tuneScreenSender(p: Peer) {
    const sender = p.tx.screen?.sender;
    if (!sender?.track) return;
    try {
      const params = sender.getParameters();
      if (!params.encodings?.length) return;
      params.encodings[0] = { ...params.encodings[0], maxBitrate: 2_500_000, maxFramerate: 30 };
      (params as RTCRtpSendParameters & { degradationPreference?: string }).degradationPreference = 'maintain-resolution';
      void sender.setParameters(params).catch(() => undefined);
    } catch {
      /* navegador sem suporte: segue com o padrão */
    }
  }

  private forEachAudio(fn: (el: HTMLAudioElement) => void) {
    for (const p of this.peers.values()) Object.values(p.audio).forEach((el) => el && fn(el));
  }

  // ───────────────────────────── Indicador de fala ─────────────────────────────

  private addMeter(id: string, stream: MediaStream) {
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        this.ctx = new Ctx();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
      this.removeMeter(id);
      const source = this.ctx.createMediaStreamSource(stream);
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      this.meters.set(id, { analyser, source, buffer: new Float32Array(analyser.fftSize), lastLoud: 0 });
    } catch {
      /* sem Web Audio: só não mostra o indicador */
    }
  }

  private removeMeter(id: string) {
    const m = this.meters.get(id);
    if (!m) return;
    try {
      m.source.disconnect();
    } catch {
      /* já desconectado */
    }
    this.meters.delete(id);
  }

  private measure() {
    if (this.destroyed || !this.meters.size) return;
    const now = performance.now();
    const speaking: string[] = [];
    for (const [id, m] of this.meters) {
      m.analyser.getFloatTimeDomainData(m.buffer);
      let sum = 0;
      for (let i = 0; i < m.buffer.length; i++) sum += m.buffer[i]! * m.buffer[i]!;
      const rms = Math.sqrt(sum / m.buffer.length);
      const silenced = id === this.opts.selfId ? this.muted : this.deafened;
      if (rms > SPEAKING_THRESHOLD && !silenced) m.lastLoud = now;
      if (now - m.lastLoud < SPEAKING_HOLD_MS && !silenced) speaking.push(id);
    }
    speaking.sort();
    const prev = this.snapshot.speaking;
    if (prev.length !== speaking.length || prev.some((v, i) => v !== speaking[i])) this.update({ speaking });
  }

  // ───────────────────────────── Estado ─────────────────────────────

  private setStatus(id: string, status: PeerStatus) {
    if (this.snapshot.status[id] === status) return;
    this.update({ status: { ...this.snapshot.status, [id]: status } });
  }

  private update(patch: Partial<EngineSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    if (!this.destroyed) this.opts.onChange(this.snapshot);
  }
}
