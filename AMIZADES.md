# Amizades e mensagens privadas

Na comunidade, abra **Pessoas e mensagens → Amigos → Adicionar amigos**. Envie um pedido para um colega. Quem recebeu o pedido pode aceitar ou recusar em **Pendentes**; quem enviou pode cancelar. Amigos podem ser removidos pela lista ou pela conversa.

Somente amizades aceitas permitem enviar mensagens privadas. O banco verifica essa regra em cada envio, inclusive se o cliente estiver desatualizado ou a chamada for feita diretamente à API. A aceitação só pode ser feita pelo destinatário do pedido. Não há amizade automática entre contas já existentes.

A barra de mensagens diretas mostra pessoas com quem já existe histórico e o amigo cuja conversa foi aberta explicitamente. O cadastro ou login de alguém não cria uma conversa. O diretório completo fica em Adicionar amigos. Depois de remover uma amizade, os participantes continuam podendo ler seu histórico, mas novos envios ficam bloqueados.

As solicitações são atualizadas a cada cinco segundos enquanto a aba está visível e ao voltar à janela. Falhas ao verificar amizades bloqueiam o envio na interface.

## Banco e validação

`supabase/friendships.sql` deve ser aplicado depois de `supabase/direct-messages.sql` e `supabase/social.sql`. A alteração foi aplicada no projeto conectado via migração `community_friend_requests_and_private_message_access`.

`supabase/friendships.verify.sql` testa com três contas temporárias e rollback: criação, aceite, recusa, cancelamento, remoção, pedidos invertidos duplicados, tentativa de aceitar o próprio pedido, falsificação de remetente, acesso de terceiros, bloqueio antes do aceite e depois da remoção e preservação do histórico. Todos os cenários passaram sem manter dados temporários.

Validação local: 51 testes passaram e a compilação de produção passou. O advisor de segurança não encontrou problemas novos de RLS; permanece o aviso anterior de [proteção contra senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), que não foi alterado nesta tarefa.
