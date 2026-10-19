# Jogos, capturas e conquistas

## Jogar com a turma

Abra **Jogos**, escolha Rabisco ou SlitherSenai e clique em **Criar sala**.
Use **Copiar convite** para enviar o link ou **Chamar a turma** para publicar um
convite no Social. As salas aceitam até oito contas autenticadas e também aparecem
na lista de salas da comunidade. Cada conta ocupa uma posição no placar.

Rabisco precisa de duas pessoas: a cada rodada, uma desenha uma palavra secreta
e as outras adivinham. A rodada dura 60 segundos. Cada pessoa tem oito palpites,
com intervalo mínimo entre eles. Um acerto dá dez pontos a quem adivinhou e três
a quem desenhou. O anfitrião inicia a rodada seguinte.

SlitherSenai é uma arena de cobras em grade. Clique na arena e use as setas/WASD,
ou os botões na tela. Colete alimentos para crescer e pontuar. Uma colisão faz
sua cobra reaparecer; os pontos da rodada são mantidos. As rodadas duram 90 segundos.

O estado e as pontuações são calculados pelo banco, sem depender de WebRTC ou TURN.
O anfitrião mantém a arena avançando enquanto a aba está visível. Se sair ou
ficar inativo por 60 segundos, outro participante assume. São jogos casuais para
grupos pequenos; a velocidade depende da latência até o banco.

## Guardar momentos

Nos jogos, **Salvar captura** guarda a imagem do tabuleiro no perfil. **Gravar
clipe** grava até 30 segundos da imagem do jogo, sem microfone ou áudio. A gravação
depende do suporte do navegador a MediaRecorder e canvas.captureStream.

Em **Perfil de jogos → Capturas**, também é possível enviar imagens PNG/JPG/WebP
ou vídeos MP4/WebM de até 50 MB, compartilhar no Social ou excluir um arquivo.
O armazenamento é privado para usuários autenticados da comunidade. A galeria
usa links temporários; enviar para a galeria não publica automaticamente no Social.

## Medalhas e personalização

- Primeira conexão: entrar na primeira sala.
- Artista da turma: outra pessoa acertar sua palavra desenhada.
- Olho de águia: acertar uma palavra no Rabisco.
- Rei da arena: coletar cinco alimentos em uma rodada de SlitherSenai.
- Memória de jogador: salvar a primeira captura ou clipe.

Cada medalha libera um título e uma moldura em **Perfil de jogos → Conquistas**.
A moldura e o título aparecem nesse perfil. O servidor verifica o desbloqueio
antes de equipar; o cliente não pode escrever medalhas ou pontuações diretamente.

## Limitações da verificação nesta sessão

O build de produção, os 39 testes locais e os testes de integração no Supabase passaram. Os dados e
as duas contas temporárias foram desfeitos por rollback. O auditor de segurança
não apontou problemas nos novos objetos (há um aviso preexistente sobre proteção
contra senhas vazadas no Auth, que não foi alterada).

A suíte local pode ser executada com `npm.cmd test`. Não havia navegador
conectado nesta sessão para validar visualmente dois dispositivos.

`supabase/gaming-capacity-followup.sql` também foi aplicado. Ele adiciona índices
e mantém o limite de oito ao reentrar depois de ficar inativo numa sala cheia.

## Banco e verificação

`supabase/gaming.sql` contém a configuração inicial completa para uma instalação
nova. Ela já foi aplicada ao projeto conectado; não execute esse arquivo novamente
em um banco que já contém essas tabelas. `supabase/gaming.verify.sql` verifica
fluxos de duas contas, isolamento da palavra, pontuação, arquivos e políticas
dentro de uma transação que desfaz todos os dados temporários.

Para verificar o navegador: entre com duas contas em dispositivos diferentes,
abra o mesmo convite, teste uma rodada de cada jogo, salve uma captura, compartilhe
no Social e equipe uma moldura conquistada. Confirme que o placar e o desenho
aparecem para ambos. Nunca coloque uma chave de administração no frontend.
