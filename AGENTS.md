<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The public index (/) is the landing page; the community experience lives at /comunidade with inline account dialogs; database RLS requires membership authentication for messages.
- Use generated Cloud clients for durable chat and private Realtime channels for browser WebRTC signaling; stop every media track and subscription when leaving a call.
- Define all community appearance in semantic global CSS tokens and use shared design-system controls.
