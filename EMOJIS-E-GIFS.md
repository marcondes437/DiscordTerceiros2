# Emojis e GIFs no chat

Os botões **GIF** e **emoji** ficam ao lado do campo de mensagem nos canais da comunidade e nas conversas privadas. O seletor acompanha o tema escolhido na loja.

- Emojis: categorias, pesquisa em português e histórico dos últimos 24 usados por conta/navegador. O emoji entra na posição do cursor, substituindo o texto selecionado.
- GIFs: painel com categorias, pesquisa, favoritos individuais e prévia antes do envio. Clique no GIF e depois em **Enviar**. É possível remover a prévia antes de enviar e incluir até três GIFs por mensagem.
- As mensagens usam os campos de texto existentes, sem mudar o banco. URLs diretas de GIFs dos CDNs GIPHY/Tenor aparecem como mídia; outros links continuam como texto. Apenas HTTPS e formatos GIF/WebP nos hosts permitidos são incorporados. Mensagens antigas continuam funcionando.
- As regras de amizade continuam necessárias para enviar mensagens privadas. O seletor também fica desativado quando o envio não está permitido.
- Há controles para pausar/reproduzir. Quando o navegador solicita movimento reduzido, as animações nas mensagens começam pausadas e as prévias do seletor mostram os títulos.

## Coleção inicial, sem chave

O site já funciona com 11 GIFs escolhidos, nas categorias Reações, Surpresa, Gatos e Festa. A busca percorre os títulos e palavras-chave dessa coleção, não todo o catálogo online. As prévias e mídias são carregadas diretamente do GIPHY; não são copiadas para o servidor. Os 11 endereços de prévia foram verificados com sucesso antes da publicação. Conteúdo externo pode deixar de estar disponível; nesse caso, a mensagem oferece o link para abrir o GIF.

Favoritos guardam IDs por conta neste navegador, não uma cópia dos GIFs. Sem permissão de armazenamento, continuam disponíveis durante a sessão. A coleção está em `src/data/chat-gifs.ts` e os emojis em `src/data/chat-emojis.ts`.

## Ativar busca completa

### Alternativa sem chave: KLIPY

O painel também oferece **Pesquisar mais GIFs no KLIPY**. A busca abre em outra aba, usando o termo digitado. No site, copie o endereço direto da imagem GIF/WebP e cole no campo **Endereço do GIF**; depois clique em **Adicionar GIF à mensagem** e envie normalmente. O conteúdo aparece como GIF no chat e na prévia do rascunho.

Essa opção funciona sem chave de API. Os links diretos do CDN `static.klipy.com` são aceitos; links de páginas e outros hosts continuam bloqueados como mídia. A busca externa foi verificada no endereço público do KLIPY. Não há uma busca automática do catálogo KLIPY dentro do seletor: a integração por API requer uma chave própria, conforme a [documentação do provedor](https://klipy.com/developers). Os testes cobrem a busca externa, inclusão do GIF e rejeição de páginas/hosts falsos.

### GIPHY dentro do seletor

1. Crie uma chave para Web no [painel GIPHY Developers](https://developers.giphy.com/dashboard/).
2. Na Vercel, adicione **VITE_GIPHY_API_KEY** em Environment Variables, para os ambientes que usa.
3. Faça um novo deploy. Para desenvolvimento local, use a mesma variável no `.env` e reinicie o servidor.

Com a chave, o painel usa Trending e Search do GIPHY, com paginação, debounce, cancelamento de pesquisas anteriores, indicação de carregamento e opção de tentar novamente. As buscas são diretas do navegador, com classificação `pg` e idioma `pt`. As URLs de mídia retornadas são usadas sem alteração. O painel exibe atribuição GIPHY; os resultados não são misturados com outros provedores. As chaves beta têm limites próprios; a aplicação trata erros de cota sem afirmar que a busca não encontrou resultados.

O Tenor anunciou o encerramento de sua API pública em 30/06/2026. Por isso, esta integração usa GIPHY e reproduz a organização do seletor do Discord, sem depender dos endpoints privados do Discord.

Fontes: [Tenor — aviso de encerramento](https://support.google.com/tenor/answer/10455265?hl=en), [GIPHY — API, parâmetros e requisitos de integração](https://developers.giphy.com/docs/api/).

## Verificação

`npm.cmd test` cobre seleção/inserção, posição do cursor e limites, busca, favoritos, prévia/remoção, erros da API, incorporação segura e bloqueio do seletor em DMs sem amizade. `npm.cmd run build` valida a compilação de produção. A busca online foi testada com respostas simuladas, pois ainda não há chave configurada. A conferência visual com duas contas em navegador continua necessária.
