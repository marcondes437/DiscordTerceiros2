import type { BrowserGame, GameCategory } from './games';

// Links supplied by the community and checked on 2026-10-19. A successful HTTP
// response does not verify gameplay, offline support or ownership of game data.
function external(
  id: string, name: string, url: string | null, categories: GameCategory[],
  description: string, color: string, extra: Pick<BrowserGame, 'note' | 'unavailableReason'> = {},
): BrowserGame {
  return { id, name, url, categories, description, color, external: true, image: `/games/external/${id}.svg`, ...extra };
}

export const externalGames: BrowserGame[] = [
  external('moon-zombies', 'Moon Zombies', null, ['Ação'], 'O endereço enviado não apresenta mais o jogo.', '#8253a2', { unavailableReason: 'O link redireciona para outra página.' }),
  external('gta-vice-city', 'GTA: Vice City', 'https://joncodeofficial.github.io/gta-vice-city-wasm/', ['Offline', 'Ação'], 'Explore Vice City nesta adaptação para navegador.', '#cd478d'),
  external('quake-3', 'Quake III Arena', 'https://q3.pieter.com/', ['Online', 'Ação'], 'Arena multiplayer com partidas direto no navegador.', '#d15a35'),
  external('bo1-zombies', 'Black Ops Zombies', null, ['Ação'], 'O endereço de BO1 Zombies está indisponível.', '#987443', { unavailableReason: 'O site retorna indisponível (HTTP 451).' }),
  external('half-life', 'Half-Life', 'https://pixelsuft.github.io/hl/', ['Offline', 'Ação'], 'Acesse a adaptação de Half-Life para navegador.', '#dc772e'),
  external('skate-3', 'Skate 3 — Fan Game', 'https://skate.aaddpp.lol/', ['Offline', 'Esportes'], 'Manobras e exploração em uma adaptação feita por fãs.', '#448d91', { note: 'O site informa que precisa dos dados convertidos da sua própria cópia do jogo.' }),
  external('halo-ce', 'Halo CE / Combat Lab', 'https://mitchellhynes.com/combat-lab/', ['Ação'], 'O link de Halo CE abre o projeto Combat Lab.', '#617e46'),
  external('diablo', 'Diablo Web', 'https://johnimril.github.io/diablo_web/', ['Offline', 'RPG'], 'Explore masmorras na adaptação de Diablo para navegador.', '#aa3635'),
  external('modern-warfare-2', 'Modern Warfare 2 / OVZ', 'https://ovz-game-production.up.railway.app/', ['Ação'], 'Abra o projeto Open Victor Zulu pelo navegador.', '#7d8b4c'),
  external('kino-der-toten', 'Kino der Toten', null, ['Ação'], 'O endereço enviado não apresenta mais o jogo.', '#a35a42', { unavailableReason: 'O link redireciona para outra página.' }),
  external('pes-6', 'PES 6', 'https://pes6.optijuegos.net/', ['Esportes'], 'Futebol no projeto PES 6 Web Online Port.', '#3987ae'),
  external('urban-terror', 'Urban Terror', 'https://ut.pieter.com/', ['Online', 'Ação'], 'Combate multiplayer no navegador.', '#747e9f', { note: 'Enviado como Unreal Tournament; o endereço abre Urban Terror.' }),
  external('black-ops-2', 'Black Ops 2 / Vibeslops', 'https://vibeslops.luckeysystems.com/', ['Ação'], 'Acesse o projeto Vibeslops do link compartilhado.', '#ab6741'),
  external('simpsons-hit-run', 'The Simpsons: Hit & Run', 'https://shar-wasm.cjoseph.workers.dev/?skipmovie', ['Offline', 'Corrida'], 'Explore Springfield na adaptação WebAssembly.', '#bd922f'),
  external('quake-1', 'Quake / QuakeWorld', 'https://q1.pieter.com/', ['Online', 'Ação'], 'A versão QuakeWorld com partidas multiplayer online.', '#9a6743'),
  external('skate-rust', 'Skate Rust', 'https://global-terror.net/', ['Esportes'], 'Acesse o projeto TERRORDOTNET compartilhado pela comunidade.', '#8e625b'),
  external('halo-ce-mobile', 'Halo CE Mobile', 'https://hcemobile.com/', ['Ação'], 'Acesse o projeto HCEMobile pelo navegador.', '#527c85'),
  external('bo3-cheese-cube', 'BO3 Cheese Cube', null, ['Ação'], 'O endereço enviado não apresenta mais o jogo.', '#a18a3c', { unavailableReason: 'O link redireciona para outra página.' }),
  external('return-to-castle-wolfenstein', 'Return to Castle Wolfenstein', 'https://rtcw.pieter.com/', ['Online', 'Ação'], 'Partidas multiplayer nesta adaptação para navegador.', '#97705b'),
  external('cs-surf', 'CS Surf', 'https://surfd.net/', ['Online', 'Ação'], 'Surfe pelas rampas do projeto Surfd.', '#4c93b3'),
  external('webxash', 'Half-Life / CS 1.6', 'https://x8bitrain.github.io/webXash/', ['Ação'], 'Abra o motor WebXash para Half-Life e Counter-Strike.', '#b4874c', { note: 'A configuração e os arquivos necessários são informados no site do projeto.' }),
  external('quake-2', 'Quake II', 'https://q2.pieter.com/', ['Online', 'Ação'], 'Combates multiplayer no navegador.', '#a96a3d'),
  external('hedgewars', 'Hedgewars', null, ['Raciocínio'], 'O endereço WebWars não respondeu à verificação.', '#93804d', { unavailableReason: 'Não foi possível verificar a disponibilidade do site.' }),
  external('gta-5', 'GTA 5', null, ['Ação'], 'O link enviado leva a uma página arquivada, sem jogo confirmado.', '#587c57', { unavailableReason: 'O link é um arquivo de página; não foi possível confirmar um jogo disponível.' }),
  external('wasm-arcade', 'WASM Arcade — GTA e Minecraft', 'https://wasmarcade.com/', ['Coleções'], 'Explore a coleção de jogos do portal WASM Arcade.', '#7662b1'),
];
