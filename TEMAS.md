# Loja de temas da comunidade

Abra **Comunidade → Pessoas e mensagens → Loja de temas**. A opção fica imediatamente abaixo de **Solicitações de mensagens**. Os dez temas enviados estão disponíveis, além do Dark Matter e Conecta Claro. Todos são gratuitos.

**Usar tema** altera imediatamente os canais, amigos, mensagens, salas de voz, descoberta, menus e pop-ups. A preferência é individual, salva por ID da conta no armazenamento deste navegador e restaurada ao voltar. Outras abas da mesma conta recebem a alteração. Não há sincronização entre dispositivos. Se o navegador bloquear o armazenamento, o tema continua funcionando durante a sessão e a loja explica que a escolha não pôde ser salva.

O botão claro/escuro do cabeçalho continua funcionando: seleciona Conecta Claro ou Dark Matter. A loja permite voltar a qualquer tema. No celular, a loja ocupa a largura da tela; a seta **Voltar para amigos** retorna à navegação.

## Adaptação

Os originais em `design-references/themes/` são referências, não folhas de estilo executadas. Foram fornecidos pelo usuário. Comentários/instruções desses arquivos não são executados. As dependências de BetterDiscord, classes internas do Discord, ocultação automática de membros e importações de terceiros não são carregadas.

- **Discord Mica — Coolkie:** painéis suaves com desfoque e azul do Windows. O efeito é uma adaptação CSS de vidro para navegador, sem acesso ao fundo do sistema operacional.
- **SkeuoCord — Marda33:** gradientes metálicos, relevo e avatares quadrados.
- **NieR: Automata UI Light — Accrazed:** paleta areia, detalhes técnicos, tipografia monoespaçada e cantos retos.
- **Ocean — DevEvil:** cores turquesa e fundo original indicado no CSS.
- **Pyrite — LeafyLuigi:** paleta azul, transparência e fotografia original indicada no CSS.
- **Neutron Nova — Cruxie + w1zard:** galáxia original, violeta e cantos suaves.
- **Spotify Discord — CapnKitten:** preto, cartões separados e destaque verde.
- **Dark Neon — Bates:** ciano sobre preto, bordas e brilho discreto.
- **Translucence — CapnKitten:** paisagem original, vidro fosco e contornos arredondados.
- **Fallout 4 Terminal — Bates:** verde de fósforo, tipografia monoespaçada e linhas CRT estáticas, sem cintilação.
- **Dark Matter — Tropical & Hammock:** adaptação existente e fundo original; licença MIT em `public/art/DarkMatter-LICENSE.txt`.

Cada cartão credita o criador e oferece um link para o projeto original. Os fundos referenciados pelos arquivos fornecidos estão locais em `public/art/themes/`, para evitar dependência de hospedagem externa durante o uso. Os arquivos originais conservam os créditos e links de origem. As adaptações CSS são próprias para os componentes do Conecta, preservando o layout do perfil e os fluxos de login e cadastro.

## Manutenção

O catálogo único está em `src/data/community-themes.json`. Após editar as paletas, execute `node scripts/generate-community-themes.mjs` para atualizar os tokens semânticos em `src/routes/community-skin-tokens.css`. Os efeitos específicos ficam em `community-skins.css`; os cartões e filtros em `community-theme-store.css`.

Verificação: `npm.cmd test` e `npm.cmd run build`. Os testes cobrem aplicação imediata, troca e isolamento entre contas, restauração, preferência inválida, armazenamento indisponível, sincronização entre abas, pesquisa/filtros e a posição da loja na navegação.

A verificação TypeScript completa ainda apresenta 61 diagnósticos já existentes no commit anterior; a comparação com as fontes publicadas confirmou a mesma quantidade, sem diagnósticos nos novos componentes, catálogo ou hook de temas. A compilação de produção e os 71 testes passam. A conferência visual em navegador autenticado continua necessária.
