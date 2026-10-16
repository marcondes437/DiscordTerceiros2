# Terceiros — módulo Social

Esta versão usa o projeto `DiscordTerceiros2-main` como base, preservando seus arquivos e acrescentando `/social`.

## Instalação

1. Execute `npm install`.
2. Configure as variáveis do `.env.example` no `.env` conforme as instruções originais.
3. No projeto Supabase associado, abra SQL Editor e execute `supabase/social.sql` **uma vez** (verifique antes se as tabelas não existem).
4. Execute `npm run dev` e abra `/social`.

## Funcionalidades

Feed de texto, curtidas, comentários, reposts, seguidores, pesquisa, denúncia e exclusão das próprias publicações. As políticas RLS do SQL restringem escrita aos usuários autenticados. O módulo não inclui ainda upload de imagens/vídeos ou notificações.

## Atenção

Não foi possível validar o funcionamento contra seu Supabase remoto. Teste login, publicações e permissões após aplicar o SQL.
