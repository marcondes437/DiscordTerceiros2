import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { VoiceEngine, type EngineSnapshot, type PeerStatus, type Signal } from '@/lib/voice/engine';
import { getIceServers, hasRelayConfigured } from '@/lib/voice/ice';

export type CallParticipant = {
  peerId: string;
  userId: string;
  name: string;
  muted: boolean;
  deafened: boolean;
  sharing: boolean;
  joinedAt: number;
};

type Devices = { inputs: MediaDeviceInfo[]; outputs: MediaDeviceInfo[] };

const STORAGE = { input: 'senai-voice:input', output: 'senai-voice:output', volumes: 'senai-voice:volumes' };
const read = (key: string) => {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* armazenamento indisponível */
  }
};

const EMPTY: EngineSnapshot = { videos: {}, speaking: [], status: {}, audioBlocked: false };

function micConstraints(deviceId?: string): MediaStreamConstraints {
  return {
    audio: {
      ...(deviceId ? { deviceId: { ideal: deviceId } } : {}),
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  };
}

function micErrorMessage(err: unknown) {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError') return 'O microfone está bloqueado. Libere o acesso no cadeado ao lado do endereço do site.';
  if (name === 'NotFoundError') return 'Nenhum microfone encontrado. Você entrou só para ouvir.';
  if (name === 'NotReadableError') return 'Outro aplicativo está usando o microfone. Feche-o e tente de novo.';
  return 'Não foi possível usar o microfone. Você entrou só para ouvir.';
}

export function useCommunityCall() {
  const [room, setRoom] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [selfPeerId, setSelfPeerId] = useState('');
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [micAvailable, setMicAvailable] = useState(true);
  const [screen, setScreen] = useState<MediaStream | null>(null);
  const [media, setMedia] = useState<EngineSnapshot>(EMPTY);
  const [devices, setDevices] = useState<Devices>({ inputs: [], outputs: [] });
  const [inputId, setInputId] = useState('');
  const [outputId, setOutputId] = useState('');
  const [volumes, setVolumes] = useState<Record<string, number>>({});

  const channel = useRef<RealtimeChannel | null>(null);
  const engine = useRef<VoiceEngine | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const display = useRef<MediaStream | null>(null);
  const meta = useRef<CallParticipant | null>(null);
  const muteBeforeDeafen = useRef(false);
  const generation = useRef(0);
  const joining = useRef(false);
  const failedNotice = useRef(false);

  const canShare = typeof navigator !== 'undefined' && !!navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices;

  const publish = useCallback((patch: Partial<CallParticipant>) => {
    if (!meta.current) return;
    meta.current = { ...meta.current, ...patch };
    void channel.current?.track(meta.current);
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const list = await navigator.mediaDevices.enumerateDevices().catch(() => []);
    setDevices({
      inputs: list.filter((d) => d.kind === 'audioinput' && d.deviceId),
      outputs: list.filter((d) => d.kind === 'audiooutput' && d.deviceId),
    });
  }, []);

  const stopDisplay = useCallback(() => {
    display.current?.getTracks().forEach((t) => t.stop());
    display.current = null;
    setScreen(null);
    engine.current?.setDisplay(null);
    publish({ sharing: false });
  }, [publish]);

  const leave = useCallback(() => {
    generation.current++;
    engine.current?.destroy();
    engine.current = null;
    if (channel.current) void supabase.removeChannel(channel.current);
    channel.current = null;
    mic.current?.getTracks().forEach((t) => t.stop());
    display.current?.getTracks().forEach((t) => t.stop());
    mic.current = null;
    display.current = null;
    meta.current = null;
    failedNotice.current = false;
    setRoom(null);
    setConnecting(false);
    setParticipants([]);
    setSelfPeerId('');
    setScreen(null);
    setMedia(EMPTY);
    setMuted(false);
    setDeafened(false);
    setMicAvailable(true);
  }, []);

  const join = useCallback(
    async (nextRoom: string, userId: string, name: string) => {
      if (joining.current) return;
      joining.current = true;
      leave();
      const current = generation.current;
      setConnecting(true);
      setRoom(nextRoom);
      try {
        // 1. Microfone (se falhar, entra só para ouvir — como no Discord)
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia(micConstraints(read(STORAGE.input) || undefined));
        } catch (err) {
          toast.warning(micErrorMessage(err));
        }
        if (current !== generation.current) {
          stream?.getTracks().forEach((t) => t.stop());
          return;
        }
        mic.current = stream;
        setMicAvailable(!!stream);
        setMuted(!stream);
        setInputId(stream?.getAudioTracks()[0]?.getSettings().deviceId ?? '');
        void refreshDevices();

        // 2. Motor WebRTC
        const iceServers = await getIceServers();
        if (current !== generation.current) return;
        const peerId = crypto.randomUUID();
        setSelfPeerId(peerId);
        let savedVolumes: Record<string, number> = {};
        try {
          savedVolumes = JSON.parse(read(STORAGE.volumes) || '{}') as Record<string, number>;
        } catch {
          savedVolumes = {};
        }
        setVolumes(savedVolumes);

        const ch = supabase.channel(`senai-voice:${nextRoom}`, {
          config: { private: true, presence: { key: peerId }, broadcast: { self: false } },
        });
        const voice = new VoiceEngine({
          selfId: peerId,
          iceServers,
          send: (signal: Signal) => void ch.send({ type: 'broadcast', event: 'signal', payload: signal }),
          onChange: (snapshot) => {
            if (current === generation.current) setMedia(snapshot);
          },
          onPeerFailed: () => {
            if (failedNotice.current) return;
            failedNotice.current = true;
            toast.error(
              hasRelayConfigured()
                ? 'Não foi possível conectar com um participante. Verifique a internet de vocês.'
                : 'Não foi possível conectar com um participante. Redes de escola ou 4G costumam exigir um servidor TURN (veja LEIA-ME).',
            );
          },
        });
        engine.current = voice;
        channel.current = ch;
        voice.setMic(stream);
        voice.setMuted(!stream);
        const outSaved = read(STORAGE.output);
        if (outSaved) {
          setOutputId(outSaved);
          void voice.setOutputDevice(outSaved);
        }

        // 3. Sinalização + presença
        await supabase.realtime.setAuth();
        ch.on('broadcast', { event: 'signal' }, ({ payload }) => voice.handleSignal(payload as Signal));
        ch.on('presence', { event: 'sync' }, () => {
          const state = ch.presenceState<CallParticipant>();
          const list = Object.values(state)
            .map((metas) => metas[metas.length - 1])
            .filter((p): p is CallParticipant & { presence_ref: string } => !!p && typeof p.peerId === 'string')
            .sort((a, b) => a.joinedAt - b.joinedAt);
          setParticipants(list);
          voice.syncPeers(list.map((p) => p.peerId));
          list.forEach((p) => {
            const v = savedVolumes[p.userId];
            if (typeof v === 'number') voice.setVolume(p.peerId, v);
          });
        });

        meta.current = { peerId, userId, name, muted: !stream, deafened: false, sharing: false, joinedAt: Date.now() };
        await new Promise<void>((resolve, reject) => {
          ch.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              void ch.track(meta.current!).then(() => resolve());
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              reject(new Error('Não foi possível entrar na sala. Confira sua conexão e tente de novo.'));
            }
          });
        });
        if (current !== generation.current) return;
        setConnecting(false);
      } catch (e) {
        if (current === generation.current) {
          leave();
          toast.error(e instanceof Error ? e.message : 'Não foi possível entrar na sala.');
        }
      } finally {
        joining.current = false;
      }
    },
    [leave, refreshDevices],
  );

  const toggleMute = useCallback(async () => {
    const voice = engine.current;
    if (!voice) return;
    // Sem microfone ainda: tenta pedir de novo
    if (!mic.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(micConstraints(read(STORAGE.input) || undefined));
        mic.current = stream;
        voice.setMic(stream);
        setMicAvailable(true);
        void refreshDevices();
      } catch (err) {
        toast.error(micErrorMessage(err));
        return;
      }
    }
    const next = mic.current ? !muted : true;
    voice.setMuted(next);
    setMuted(next);
    if (!next && deafened) {
      voice.setDeafened(false);
      setDeafened(false);
      publish({ muted: false, deafened: false });
    } else {
      publish({ muted: next });
    }
  }, [muted, deafened, publish, refreshDevices]);

  const toggleDeafen = useCallback(() => {
    const voice = engine.current;
    if (!voice) return;
    const next = !deafened;
    voice.setDeafened(next);
    setDeafened(next);
    if (next) {
      muteBeforeDeafen.current = muted;
      voice.setMuted(true);
      setMuted(true);
      publish({ deafened: true, muted: true });
    } else {
      const restore = muteBeforeDeafen.current || !mic.current;
      voice.setMuted(restore);
      setMuted(restore);
      publish({ deafened: false, muted: restore });
    }
  }, [deafened, muted, publish]);

  const toggleShare = useCallback(async () => {
    if (!engine.current) return;
    if (display.current) {
      stopDisplay();
      return;
    }
    if (!canShare) {
      toast.error('Este navegador não compartilha tela. Use Chrome, Edge ou Firefox no computador.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 30 }, width: { max: 1920 }, height: { max: 1080 } },
        // Som da aba/sistema (Chrome/Edge). Outros navegadores ignoram.
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        systemAudio: 'include',
        selfBrowserSurface: 'exclude',
      } as DisplayMediaStreamOptions);
      if (!engine.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = stream.getVideoTracks()[0];
      if (!video) return;
      if ('contentHint' in video) video.contentHint = 'detail';
      video.addEventListener('ended', () => {
        if (display.current === stream) stopDisplay();
      });
      display.current = stream;
      setScreen(stream);
      engine.current.setDisplay(stream);
      publish({ sharing: true });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'NotAllowedError') return; // usuário cancelou
      toast.error('Não foi possível compartilhar a tela.');
    }
  }, [canShare, publish, stopDisplay]);

  const setInputDevice = useCallback(
    async (deviceId: string) => {
      write(STORAGE.input, deviceId);
      setInputId(deviceId);
      if (!engine.current) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        const old = mic.current;
        mic.current = stream;
        engine.current.setMic(stream);
        engine.current.setMuted(muted);
        old?.getTracks().forEach((t) => t.stop());
        setMicAvailable(true);
      } catch (err) {
        toast.error(micErrorMessage(err));
      }
    },
    [muted],
  );

  const setOutputDevice = useCallback((deviceId: string) => {
    write(STORAGE.output, deviceId);
    setOutputId(deviceId);
    void engine.current?.setOutputDevice(deviceId);
  }, []);

  const setVolume = useCallback(
    (participant: CallParticipant, volume: number) => {
      engine.current?.setVolume(participant.peerId, volume);
      setVolumes((prev) => {
        const next = { ...prev, [participant.userId]: volume };
        write(STORAGE.volumes, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const resumeAudio = useCallback(() => void engine.current?.resumeAudio(), []);

  useEffect(() => {
    if (!room) return;
    const onDevice = () => void refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', onDevice);
    const onHide = () => leave();
    window.addEventListener('pagehide', onHide);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDevice);
      window.removeEventListener('pagehide', onHide);
    };
  }, [room, leave, refreshDevices]);

  useEffect(() => () => leave(), [leave]);

  const speaking = new Set(media.speaking);
  const status: Record<string, PeerStatus> = media.status;

  return {
    room,
    connecting,
    participants,
    selfPeerId,
    muted,
    deafened,
    micAvailable,
    screen,
    videos: media.videos,
    speaking,
    status,
    audioBlocked: media.audioBlocked,
    devices,
    inputId,
    outputId,
    volumes,
    canShare,
    join,
    leave,
    toggleMute,
    toggleDeafen,
    toggleShare,
    setInputDevice,
    setOutputDevice,
    setVolume,
    resumeAudio,
  };
}

export type CommunityCall = ReturnType<typeof useCommunityCall>;
