# Opções de exclusão no chat

Clique na lixeira ao lado de uma mensagem nos canais da comunidade ou nas conversas privadas.

- **Apagar para mim:** oculta a mensagem da interface para sua conta neste navegador. Funciona tanto nas suas mensagens quanto nas recebidas. Os IDs ocultados são persistidos por conta, separados entre canais e DMs, e sincronizados entre abas. Não há exclusão no banco nem sincronização entre dispositivos. Se o navegador bloquear o armazenamento, a mensagem fica oculta durante a sessão e um aviso informa a limitação.
- **Apagar para todos:** disponível somente nas mensagens enviadas por você. Remove a mensagem do banco. A interface só considera a exclusão concluída quando o servidor devolve o ID removido; erros mantêm a opção aberta para tentar novamente.
- **Cancelar:** fecha o seletor sem alterar a mensagem.

O texto explicativo em cada opção distingue os dois efeitos. A ação só acontece depois de escolher uma opção na caixa de diálogo. Os campos de texto/GIFs continuam funcionando normalmente e os temas da comunidade também se aplicam ao seletor.

Não foi necessário alterar o esquema ou as permissões existentes no Supabase. Foram conferidas por consulta de leitura as políticas `Members delete own messages` (canais) e `Sender deletes own direct messages` (DMs), ambas limitadas ao autor autenticado, com RLS ativo. O filtro de autor também é enviado pelo cliente. Nenhuma mensagem real foi removida durante a validação.

Além do Realtime existente, os canais agora conferem alterações a cada cinco segundos enquanto a aba está visível e ao recuperar o foco. Respostas idênticas preservam a referência da lista para não repetir animações nem rolar o histórico em cada consulta. As DMs já possuem atualização periódica equivalente.

Verificação: 87 testes passam, incluindo as escolhas, falha na exclusão, persistência e isolamento por conta, armazenamento indisponível e exclusão autenticada da própria DM. A verificação TypeScript mantém os diagnósticos anteriores; sem novos diagnósticos nos arquivos de exclusão. A conferência visual com duas contas ainda é necessária.
