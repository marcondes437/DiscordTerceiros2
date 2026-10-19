# Jogos da comunidade

O catálogo contém apenas Rabisco e SlitherSenai. As capas e as artes de destaque em public/games são ilustrações SVG originais criadas para este projeto; não são capturas dos jogos.

Rabisco foi conectado ao endereço publicado informado pelo usuário: https://rabisco-rho.vercel.app/. O catálogo e o destaque da home usam a URL central em `src/data/games.ts` e abrem em uma nova aba. SlitherSenai continua usando o jogo integrado em `/jogar?game=slithersenai`. Links antigos de salas do Rabisco integrado continuam preservados; as salas, contas e pontuações do site externo não são sincronizadas automaticamente com o Conecta.

Favoritos são guardados no campo favorite_games dos metadados da própria conta. Foto, apelido, capa e bio vêm do perfil da comunidade. O perfil de jogos não inventa tempo jogado nem conquistas; esses dados dependem de integração futura com os jogos.
