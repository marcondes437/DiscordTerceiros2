# Áudio e compartilhamento de tela na Vercel

A lista de participantes usa Supabase Realtime. Áudio e tela usam WebRTC entre
os navegadores. Ver alguém na sala não confirma que a mídia está conectada.

Para conectar pessoas em redes que bloqueiam conexões diretas, configure um
servidor TURN. O projeto não inclui um serviço TURN nem credenciais.

Em Vercel → Settings → Environment Variables, adicione os dados fornecidos pelo
seu serviço TURN (os exemplos abaixo não são credenciais reais):

```env
VITE_TURN_URLS=turn:seu-servidor:3478,turns:seu-servidor:5349
VITE_TURN_USERNAME=usuario-fornecido-pelo-provedor
VITE_TURN_CREDENTIAL=credencial-fornecida-pelo-provedor
```

Como alternativa, o código aceita um domínio e uma chave de credenciais TURN
do Metered:

```env
VITE_METERED_DOMAIN=seu-dominio.metered.live
VITE_METERED_API_KEY=chave-da-api-de-credenciais-turn
```

Use somente credenciais destinadas ao cliente WebRTC, nunca uma chave
administrativa do provedor. Variáveis VITE_ são incluídas no JavaScript público.
Para produção, prefira credenciais temporárias e limitadas pelo provedor.

Selecione Production e, se usar links de prévia, Preview. Publique também as
alterações do código e faça um novo deployment: mudar as variáveis sem reconstruir
o site não atualiza os navegadores.

## Verificação

1. Abra a mesma versão do site em dois computadores, em redes diferentes.
2. Use duas contas e permita o acesso ao microfone.
3. Entre na mesma sala; o estado deve sair de “Conectando”.
4. Confirme voz nos dois sentidos. Se aparecer o botão para liberar áudio, clique nele.
5. Compartilhe uma janela e confirme que o outro computador recebe a imagem.
6. Pare e reinicie o compartilhamento; depois saia e entre novamente na sala.

Se falhar, abra `chrome://webrtc-internals` ou `edge://webrtc-internals` antes de
entrar na chamada. Confira o estado ICE e o par de candidatos selecionado. Um
candidato `relay` confirma o uso do TURN. O status “Voz conectada” da barra
indica entrada na sala; confira também o estado de cada participante.
