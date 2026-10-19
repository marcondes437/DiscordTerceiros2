import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { VoiceEngine, type Signal } from '@/lib/voice/engine';

class PeerConnection {
  static instances: PeerConnection[] = [];
  connectionState = 'new';
  signalingState = 'stable';
  localDescription: { toJSON(): RTCSessionDescriptionInit } | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;
  transceivers: any[] = [];
  onconnectionstatechange: (() => void) | null = null;
  ontrack = null;
  onicecandidate = null;
  createOffer = vi.fn(async () => ({ type: 'offer', sdp: 'offer' }));
  createAnswer = vi.fn(async () => ({ type: 'answer', sdp: 'answer' }));
  close = vi.fn();
  constructor() { PeerConnection.instances.push(this); }
  addTransceiver() {
    const t = { direction: 'sendrecv', sender: { replaceTrack: vi.fn(async () => {}), setStreams: vi.fn(), getParameters: () => ({}) } };
    this.transceivers.push(t);
    return t;
  }
  getTransceivers() { return this.transceivers; }
  async setLocalDescription(sdp: RTCSessionDescriptionInit) {
    this.signalingState = sdp.type === 'offer' ? 'have-local-offer' : 'stable';
    this.localDescription = { toJSON: () => sdp };
  }
  async setRemoteDescription(sdp: RTCSessionDescriptionInit) {
    this.remoteDescription = sdp;
    this.signalingState = sdp.type === 'answer' ? 'stable' : 'have-remote-offer';
    if (!this.transceivers.length) for (let i = 0; i < 3; i++) this.addTransceiver();
  }
}

let engine: VoiceEngine;
beforeEach(() => {
  vi.useFakeTimers();
  PeerConnection.instances = [];
  vi.stubGlobal('RTCPeerConnection', PeerConnection);
});
afterEach(() => { engine?.destroy(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('retries ICE after an answer when the media connection never connects, then reports failure', async () => {
  const failed = vi.fn();
  const signals: Signal[] = [];
  engine = new VoiceEngine({ selfId: 'a', iceServers: [], onChange: vi.fn(), onPeerFailed: failed,
    send: signal => {
      signals.push(signal);
      if (signal.kind === 'offer') queueMicrotask(() => engine.handleSignal({ ...signal, kind: 'answer', from: 'b', to: 'a', sdp: { type: 'answer', sdp: 'answer' } }));
    },
  });
  engine.syncPeers(['a', 'b']);
  await vi.advanceTimersByTimeAsync(310_000);
  expect(failed).toHaveBeenCalledExactlyOnceWith('b');
  expect(signals.filter(s => s.kind === 'offer').length).toBeGreaterThan(1);
  const count = PeerConnection.instances.length;
  engine.syncPeers(['a', 'b']);
  engine.handleSignal({ kind: 'hello', from: 'b', to: 'a' });
  await vi.advanceTimersByTimeAsync(30_000);
  expect(PeerConnection.instances).toHaveLength(count);
});

it('does not restart a connection that connected before the deadline', async () => {
  const send = vi.fn();
  engine = new VoiceEngine({ selfId: 'a', iceServers: [], onChange: vi.fn(), send });
  engine.syncPeers(['b']);
  await vi.advanceTimersByTimeAsync(0);
  const offer = send.mock.calls[0]![0];
  engine.handleSignal({ ...offer, kind: 'answer', from: 'b', to: 'a', sdp: { type: 'answer' } });
  await vi.advanceTimersByTimeAsync(0);
  const pc = PeerConnection.instances[0]!;
  pc.connectionState = 'connected';
  pc.onconnectionstatechange?.();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(pc.createOffer).toHaveBeenCalledTimes(1);
});

it('attaches screen and microphone before creating the answer', async () => {
  engine = new VoiceEngine({ selfId: 'b', iceServers: [], onChange: vi.fn(), send: vi.fn() });
  engine.handleSignal({ kind: 'offer', from: 'a', to: 'b', session: 'session', sdp: { type: 'offer' } });
  await vi.advanceTimersByTimeAsync(0);
  const pc = PeerConnection.instances[0]!;
  for (const t of pc.transceivers) {
    expect(t.sender.replaceTrack).toHaveBeenCalled();
    expect(t.sender.replaceTrack.mock.invocationCallOrder[0]).toBeLessThan(pc.createAnswer.mock.invocationCallOrder[0]!);
  }
});

it('reports missing offers on the answering side instead of waiting forever', async () => {
  const failed = vi.fn();
  const onChange = vi.fn();
  engine = new VoiceEngine({ selfId: 'b', iceServers: [], onChange, send: vi.fn(), onPeerFailed: failed });
  engine.syncPeers(['a', 'b']);
  await vi.advanceTimersByTimeAsync(30_000);
  expect(failed).toHaveBeenCalledWith('a', expect.stringContaining('não completou'));
  expect(onChange.mock.lastCall?.[0].status.a).toBe('failed');
  engine.syncPeers(['b']);
  engine.syncPeers(['a', 'b']);
  await vi.advanceTimersByTimeAsync(5_000);
  expect(failed).toHaveBeenCalledTimes(1);
});

it('reports SDP errors rather than swallowing them and staying connecting', async () => {
  const failed = vi.fn();
  engine = new VoiceEngine({ selfId: 'a', iceServers: [], onChange: vi.fn(), send: vi.fn(), onPeerFailed: failed });
  engine.syncPeers(['b']);
  const pc = PeerConnection.instances[0]!;
  pc.createOffer.mockRejectedValueOnce(new Error('SDP unavailable'));
  await vi.advanceTimersByTimeAsync(0);
  expect(failed).toHaveBeenCalledWith('b', expect.stringContaining('SDP unavailable'));
  expect(pc.close).toHaveBeenCalled();
});
