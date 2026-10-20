import { useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, HeadphoneOff, Maximize2, Mic, MicOff, MonitorUp, MonitorX, PhoneOff, Settings2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CallParticipant, CommunityCall } from '@/hooks/use-community-call';

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?'
  );
}

/* ───────────────────────── Vídeo de uma tela ───────────────────────── */

function ScreenVideo({ stream, label, self }: { stream: MediaStream; label: string; self?: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    el.srcObject = stream;
    setWaiting(true);
    const onFrame = () => setWaiting(false);
    el.addEventListener('loadeddata', onFrame);
    el.addEventListener('resize', onFrame);
    void el.play().catch(() => undefined);
    return () => {
      el.removeEventListener('loadeddata', onFrame);
      el.removeEventListener('resize', onFrame);
    };
  }, [stream]);

  function fullscreen() {
    const el = frame.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => undefined);
  }

  return (
    <div className="screen-frame" ref={frame} onDoubleClick={fullscreen}>
      <video ref={video} autoPlay playsInline muted />
      {waiting && <div className="screen-waiting">Carregando a tela…</div>}
      <div className="screen-label">
        <span className="live-dot" />
        {label}
      </div>
      {!self && (
        <Button variant="ghost" size="icon" className="screen-fullscreen" title="Tela cheia" onClick={fullscreen}>
          <Maximize2 />
        </Button>
      )}
    </div>
  );
}

/* ───────────────────────── Bloco de participante ───────────────────────── */

function ParticipantTile({
  person,
  call,
  isSelf,
  compact,
}: {
  person: CallParticipant;
  call: CommunityCall;
  isSelf: boolean;
  compact: boolean;
}) {
  const speaking = call.speaking.has(person.peerId);
  const status = call.status[person.peerId];
  const pending = !isSelf && status !== 'connected';
  const volume = call.volumes[person.userId] ?? 1;

  const body = (
    <div className={`voice-tile ${speaking ? 'is-speaking' : ''} ${compact ? 'is-compact' : ''}`}>
      <div className="tile-avatar">{initials(person.name)}</div>
      <div className="tile-name">
        <span className="truncate">{isSelf ? `${person.name} (você)` : person.name}</span>
        {person.deafened ? <HeadphoneOff className="tile-icon" aria-label="Áudio desativado" /> : person.muted ? <MicOff className="tile-icon" aria-label="Microfone desligado" /> : null}
        {!isSelf && volume === 0 && <VolumeX className="tile-icon" aria-label="Você silenciou" />}
      </div>
      {person.sharing && <span className="tile-live">Ao vivo</span>}
      {pending && <span className="tile-pending">{status === 'failed' ? 'Sem conexão' : status === 'reconnecting' ? 'Reconectando…' : 'Conectando…'}</span>}
    </div>
  );

  if (isSelf) return body;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="tile-button" title={`Volume de ${person.name}`}>
          {body}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" side="top">
        <div className="popover-title">{person.name}</div>
        <div className="volume-row">
          <Volume2 className="size-4 text-muted-foreground" />
          <Slider value={[Math.round(volume * 100)]} max={100} step={1} onValueChange={([v]: number[]) => call.setVolume(person, (v ?? 100) / 100)} aria-label="Volume" />
          <span className="volume-value">{Math.round(volume * 100)}%</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ───────────────────────── Configurações de áudio ───────────────────────── */

function AudioSettings({ call }: { call: CommunityCall }) {
  const supportsOutput = typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="control" title="Configurações de áudio">
          <Settings2 />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="top">
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Microfone
            <Select value={call.inputId || undefined} onValueChange={(v: string) => void call.setInputDevice(v)}>
              <SelectTrigger>
                <SelectValue placeholder={call.devices.inputs.length ? 'Escolha um microfone' : 'Nenhum microfone encontrado'} />
              </SelectTrigger>
              <SelectContent>
                {call.devices.inputs.map((d, i) => (
                  <SelectItem key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microfone ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          {supportsOutput && call.devices.outputs.length > 0 && (
            <label className="grid gap-2 text-sm font-medium">
              Saída de áudio
              <Select value={call.outputId || undefined} onValueChange={call.setOutputDevice}>
                <SelectTrigger>
                  <SelectValue placeholder="Padrão do sistema" />
                </SelectTrigger>
                <SelectContent>
                  {call.devices.outputs.map((d, i) => (
                    <SelectItem key={d.deviceId} value={d.deviceId}>
                      {d.label || `Saída ${i + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          )}
          <p className="text-xs text-muted-foreground leading-5">Clique em alguém da sala para ajustar o volume só dessa pessoa.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ───────────────────────── Barra de controles ───────────────────────── */

export function CallControls({ call }: { call: CommunityCall }) {
  return (
    <div className="call-controls" role="toolbar" aria-label="Controles da chamada">
      <Button variant="ghost" size="icon" className={`control ${call.muted ? 'is-off' : ''}`} title={call.muted ? 'Ligar microfone' : 'Desligar microfone'} aria-pressed={call.muted} onClick={() => void call.toggleMute()}>
        {call.muted ? <MicOff /> : <Mic />}
      </Button>
      <Button variant="ghost" size="icon" className={`control ${call.deafened ? 'is-off' : ''}`} title={call.deafened ? 'Ligar áudio' : 'Desligar áudio'} aria-pressed={call.deafened} onClick={call.toggleDeafen}>
        {call.deafened ? <HeadphoneOff /> : <Headphones />}
      </Button>
      <Button
        variant="ghost"
        className={`control control-wide ${call.screen ? 'is-active' : ''}`}
        title={call.canShare ? undefined : 'Disponível no computador (Chrome, Edge ou Firefox)'}
        disabled={!call.canShare}
        onClick={() => void call.toggleShare()}
      >
        {call.screen ? <MonitorX /> : <MonitorUp />}
        <span>{call.screen ? 'Parar' : 'Compartilhar tela'}</span>
      </Button>
      <AudioSettings call={call} />
      <Button variant="ghost" size="icon" className="control control-leave" title="Sair da chamada" onClick={call.leave}>
        <PhoneOff />
      </Button>
    </div>
  );
}

/* ───────────────────────── Sala de voz ───────────────────────── */

type Visitor = { id: string; name: string };

export function VoiceRoom({
  roomId,
  roomName,
  call,
  visitors,
  otherRoomName,
  onJoin,
}: {
  roomId: string;
  roomName: string;
  call: CommunityCall;
  visitors: Visitor[];
  otherRoomName: string | null;
  onJoin: () => void;
}) {
  const inRoom = call.room === roomId;
  const streams = useMemo(() => {
    if (!inRoom) return [];
    const list: { id: string; stream: MediaStream; label: string; self: boolean }[] = [];
    for (const p of call.participants) {
      if (p.peerId === call.selfPeerId) {
        if (call.screen) list.push({ id: p.peerId, stream: call.screen, label: 'Sua tela', self: true });
      } else if (p.sharing && call.videos[p.peerId]) {
        list.push({ id: p.peerId, stream: call.videos[p.peerId]!, label: `Tela de ${p.name}`, self: false });
      }
    }
    return list;
  }, [inRoom, call.participants, call.selfPeerId, call.screen, call.videos]);

  const [focus, setFocus] = useState<string | null>(null);
  const focused = streams.find((s) => s.id === focus) ?? streams.find((s) => !s.self) ?? streams[0];

  if (!inRoom) {
    return (
      <div className="stage stage-lobby">
        <div className="lobby">
          <div className="lobby-icon">
            <Volume2 />
          </div>
          <h1 className="lobby-title">{roomName}</h1>
          {visitors.length ? (
            <div className="lobby-people">
              <div className="avatar-stack">
                {visitors.slice(0, 5).map((v) => (
                  <span key={v.id} className="stack-avatar">
                    {initials(v.name)}
                  </span>
                ))}
              </div>
              <span>
                {visitors.length === 1 ? `${visitors[0]!.name} está aqui` : `${visitors.length} pessoas conversando`}
              </span>
            </div>
          ) : (
            <p className="lobby-copy">Ninguém por aqui ainda. Entre e chame sua turma.</p>
          )}
          <Button size="lg" className="lobby-join" onClick={onJoin} disabled={call.connecting}>
            <Volume2 />
            {otherRoomName ? 'Mudar para esta sala' : 'Entrar na sala'}
          </Button>
          {otherRoomName && <p className="lobby-note">Você vai sair de {otherRoomName}.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="stage">
      {call.connectionError && <div className="stage-banner" role="alert">{call.connectionError}</div>}
      {call.audioBlocked && (
        <div className="stage-banner">
          O navegador pausou o som da chamada.
          <Button size="sm" onClick={call.resumeAudio}>
            Ativar som
          </Button>
        </div>
      )}

      {focused ? (
        <div className="stage-focus">
          <ScreenVideo key={focused.id} stream={focused.stream} label={focused.label} self={focused.self} />
          {streams.length > 1 && (
            <div className="stream-switcher">
              {streams.map((s) => (
                <button key={s.id} type="button" className={`stream-chip ${s.id === focused.id ? 'is-active' : ''}`} onClick={() => setFocus(s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className={focused ? 'tile-strip' : 'tile-grid'}>
        {call.connecting && !call.participants.length ? (
          <p className="stage-hint">Conectando à sala…</p>
        ) : (
          call.participants.map((p) => <ParticipantTile key={p.peerId} person={p} call={call} isSelf={p.peerId === call.selfPeerId} compact={!!focused} />)
        )}
      </div>

      <CallControls call={call} />
    </div>
  );
}
