CREATE TABLE public.community_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), channel text NOT NULL CHECK (channel IN ('geral','apresentacoes','avisos','projetos','programacao','mecanica','eletrica','design')), user_id uuid NOT NULL, display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 60), content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, DELETE ON public.community_messages TO authenticated;
GRANT ALL ON public.community_messages TO service_role;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read community messages" ON public.community_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members send own messages" ON public.community_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members delete own messages" ON public.community_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX community_messages_channel_created ON public.community_messages(channel, created_at);
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;