# Configurar áudio e tela entre redes

Sem TURN, a conexão direta pode falhar em redes de escola, empresas e operadoras. A presença na sala não significa que o áudio conectou.

1. Crie sua conta de TURN em https://www.metered.ca/tools/openrelay/ e uma credencial TURN no painel.
2. Copie o domínio do aplicativo (`seuapp.metered.live`) e a **Credential API Key** dessa credencial. Não use a Secret Key da conta.
3. Em Vercel → projeto → Settings → Environment Variables, adicione:

   ```env
   VITE_METERED_DOMAIN=seuapp.metered.live
   VITE_METERED_API_KEY=chave_da_credencial_turn
   ```

4. Selecione Production (e Preview se usar links de teste), salve e faça um novo deployment. Variáveis VITE são incorporadas durante o build.
5. Teste com duas contas, uma no Wi-Fi e outra em outra rede, verificando áudio nos dois sentidos e compartilhamento de tela. Autorize o microfone e clique em “Ativar som” se o navegador bloquear a reprodução.

A Credential API Key permite obter credenciais de relay no navegador; acompanhe uso e limites no provedor. Nunca coloque a Secret Key da conta em uma variável VITE. Não publique o arquivo .env no Git.

Documentação: https://www.metered.ca/docs/turn-rest-api/get-credential/
