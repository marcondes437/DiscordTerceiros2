# Central de notificações

O sino aparece no início, no Social, nos jogos e nos canais e mensagens da comunidade. O contador mostra as notificações não lidas da conta. A central oferece Todas, Não lidas, Marcar todas como lidas e carregamento de avisos anteriores. O estado de leitura é salvo no banco e acompanha a conta entre sessões.

Eventos novos que geram avisos:

- Mensagem privada recebida de um amigo. O aviso não copia o conteúdo da mensagem. Ler a conversa também marca o aviso correspondente como lido.
- Publicação principal ou compartilhamento de alguém que o usuário já segue. Respostas e publicações próprias não geram avisos para o autor.
- Convite direto para jogar: dentro da sala, use **Convidar amigos**, pesquise pelo nome e escolha quem deve receber. Apenas amigos aceitos podem ser convidados, e quem envia precisa participar de uma sala ativa. O mesmo jogador não repete um convite para a mesma pessoa na mesma sala. **Publicar convite no Social** continua disponível como uma ação separada.

Cada aviso abre a conversa, a publicação ou a sala correspondente. Publicações antigas são carregadas pelo link mesmo quando saem das 200 mais recentes do feed. Avisos são removidos quando sua mensagem, publicação ou convite de origem é excluído. A central atualiza por Supabase Realtime, ao voltar à janela e a cada 30 segundos enquanto a aba está visível.

## Banco

`supabase/notifications.sql` cria `site_notifications`, `gaming_invitations`, as permissões e os triggers em `notification_private`. A migração `site_notifications_for_messages_posts_and_friend_game_invites` já foi aplicada no projeto conectado. Requer as tabelas anteriores de amizade, mensagens, Social e jogos. Não há avisos retroativos para ações anteriores à instalação.

Os usuários só leem suas próprias notificações e alteram seu estado de leitura. Não podem inserir avisos nem modificar remetente, destinatário ou conteúdo. Os eventos são criados por triggers internos; a tabela de notificações está na publicação Realtime com RLS por destinatário. Não são enviados emails ou notificações do sistema operacional.

## Validação

65 testes locais e compilação de produção passaram. `supabase/notifications.verify.sql` passou com três contas temporárias e rollback, verificando mensagens, seguidores, convites, leitura, bloqueio de duplicatas e falsificação, isolamento entre contas e exclusão dos avisos junto com a origem. Não foram mantidos dados temporários.

O advisor não apontou problemas novos de RLS. Permanece o aviso anterior de [proteção contra senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), que não foi alterado nesta tarefa. A aparência da central não foi inspecionada em navegador nesta sessão.
