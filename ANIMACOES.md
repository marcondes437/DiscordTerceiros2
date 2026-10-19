# Animações da comunidade

Adaptação nativa inspirada no [BetterAnimations de arg0NNY](https://github.com/okdevme/BetterAnimations), a partir do arquivo `BetterAnimations.plugin.js` 2.1.15 enviado pelo usuário. O plugin original depende de BetterDiscord, APIs internas do Discord, Node e Electron; não é importado nem executado no site. A implementação do Conecta usa CSS e Web Animations API, sem dependências novas, pacotes remotos ou execução de configurações externas.

## Efeitos

- Entrada suave na navegação entre páginas e na tela de acesso.
- Transição entre canais, visão geral, salas de voz e conversas privadas, usando os elementos existentes. As animações não criam remontagens adicionais dos componentes de mídia e não mudam o foco nem a posição de rolagem.
- Entrada de mensagens novas em canais e DMs. O histórico inicial, atualizações idênticas, exclusões e troca de canal não repetem a animação. Lotes de mais de quatro mensagens aparecem diretamente.
- Entrada e saída de menus, pop-ups de perfil, notificações e seletor de emojis/GIFs.
- Resposta suave ao passar o mouse nos cartões e ícones da comunidade.

## Preferências

Em **Pessoas e mensagens → Loja de temas → Animações da comunidade**, escolha **Fluidas**, **Discretas** ou **Desativadas**. A preferência é salva neste navegador e sincronizada entre suas abas; não é uma configuração sincronizada entre dispositivos. Se o armazenamento estiver bloqueado, a escolha vale para a sessão.

O movimento reduzido configurado no sistema tem prioridade. Mudanças nessa preferência são aplicadas durante o uso, cancelando efeitos em andamento. GIFs e efeitos cosméticos de perfil têm seus controles próprios; esta opção controla as transições adaptadas do BetterAnimations.

As animações usam deslocamentos pequenos e opacidade, sem alterar dimensões de layout ou bloquear interação. Navegadores sem Web Animations API exibem o conteúdo normalmente. Animações JavaScript em andamento são canceladas ao mudar de contexto, desativar os efeitos ou desmontar a tela.

## Arquivos e validação

- `src/components/community-motion.tsx`: preferências, controle de transição e entrada de mensagens.
- `src/routes/community-motion.css`: efeitos e apresentação do controle.
- `src/test/community-motion.test.tsx`: persistência, movimento reduzido, cancelamento, preservação de elementos e prevenção de repetição do histórico.

Validação: 83 testes passam e a compilação de produção passa. TypeScript mantém os mesmos 61 diagnósticos anteriores, sem diagnósticos nos arquivos novos de animação. Ainda é necessária conferência visual no navegador, inclusive durante uma chamada real.
