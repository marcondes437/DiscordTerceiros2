CREATE SCHEMA IF NOT EXISTS private;
-- Freeze the class chosen at signup into server-controlled authorization metadata.
-- Subsequent user_metadata updates cannot change access to the other class.
CREATE OR REPLACE FUNCTION private.assign_signup_class()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'turma' IN ('terceiro-a', 'terceiro-b') THEN
    NEW.raw_app_meta_data := coalesce(NEW.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('turma', NEW.raw_user_meta_data->>'turma');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.assign_signup_class() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER assign_signup_class BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.assign_signup_class();

UPDATE auth.users SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('turma', raw_user_meta_data->>'turma')
WHERE raw_user_meta_data->>'turma' IN ('terceiro-a', 'terceiro-b')
  AND raw_app_meta_data->>'turma' IS NULL;

ALTER TABLE public.community_messages DROP CONSTRAINT community_messages_channel_check;
ALTER TABLE public.community_messages ADD CONSTRAINT community_messages_channel_check CHECK (
  channel IN ('geral','apresentacoes','avisos','projetos','programacao','mecanica','eletrica','design',
    'terceiro-a:geral','terceiro-a:avisos','terceiro-a:estudos',
    'terceiro-b:geral','terceiro-b:avisos','terceiro-b:estudos')
);
-- Restrictive policies also constrain any existing permissive policies.
CREATE POLICY "Class messages stay within their class" ON public.community_messages
AS RESTRICTIVE FOR ALL TO authenticated
USING (position(':' in channel) = 0 OR split_part(channel, ':', 1) = (select auth.jwt()->'app_metadata'->>'turma'))
WITH CHECK (position(':' in channel) = 0 OR split_part(channel, ':', 1) = (select auth.jwt()->'app_metadata'->>'turma'));

CREATE POLICY "Class voice and presence stay within their class" ON realtime.messages
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  (select realtime.topic()) NOT LIKE 'senai-voice:%'
  OR (select realtime.topic()) IN ('senai-voice:online','senai-voice:conexao-livre','senai-voice:grupo-de-estudos','senai-voice:laboratorio-de-ideias')
  OR ((select auth.jwt()->'app_metadata'->>'turma') IN ('terceiro-a','terceiro-b')
    AND (select realtime.topic()) IN (
      'senai-voice:' || (select auth.jwt()->'app_metadata'->>'turma') || ':online',
      'senai-voice:' || (select auth.jwt()->'app_metadata'->>'turma') || ':conexao-livre',
      'senai-voice:' || (select auth.jwt()->'app_metadata'->>'turma') || ':grupo-de-estudos',
      'senai-voice:' || (select auth.jwt()->'app_metadata'->>'turma') || ':laboratorio-de-ideias'))
)
WITH CHECK (
  (select realtime.topic()) NOT LIKE 'senai-voice:%'
  OR (select realtime.topic()) IN ('senai-voice:online','senai-voice:conexao-livre','senai-voice:grupo-de-estudos','senai-voice:laboratorio-de-ideias')
  OR ((select auth.jwt()->'app_metadata'->>'turma') IN ('terceiro-a','terceiro-b')
    AND (select realtime.topic()) IN (
      'senai-voice:' || (select auth.jwt()->'app_metadata'->>'turma') || ':online',
      'senai-voice:' || (select auth.jwt()->'app_metadata'->>'turma') || ':conexao-livre',
      'senai-voice:' || (select auth.jwt()->'app_metadata'->>'turma') || ':grupo-de-estudos',
      'senai-voice:' || (select auth.jwt()->'app_metadata'->>'turma') || ':laboratorio-de-ideias'))
);
