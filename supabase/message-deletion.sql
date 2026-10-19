begin;
grant delete on public.direct_messages to authenticated;
create policy "Sender deletes own direct messages" on public.direct_messages
  for delete to authenticated using(sender_id=(select auth.uid()));
notify pgrst,'reload schema';
commit;
