-- Harjutaja · migratsioon 7: klassiga liitumine töötab jälle
-- Kleebi tervikuna Supabase'i SQL Editorisse ja vajuta Run.
--
-- MIS OLI KATKI. Migratsioon 4 kirjutas `gen_code` ümber pgcrypto
-- `gen_random_bytes` peale, aga jättis funktsioonile search_path'i määramata.
-- Kutsujad (`create_group`, `join_class`) on `security definer ... set
-- search_path = public`, ja Supabase'is elab pgcrypto skeemis `extensions`,
-- mitte `public`. Nii ei leidnud `gen_code` enam `gen_random_bytes`'i:
--
--   function gen_random_bytes(integer) does not exist
--
-- `gen_code` teeb nii klassikoodi kui mängija taastekoodi, seega olid
-- **uue klassi loomine ja klassiga liitumine mõlemad katki** — ja kliendis
-- paistis see tavalise võrguveana („Võrku pole või server ei vasta"), sest
-- PostgREST vastab sellele 404-ga. Vana mängija sai edasi mängida, uus ei
-- saanud liituda. Kohalikus Postgresis viga ei paistnud, sest seal on
-- pgcrypto `public` skeemis.
--
-- PARANDUS: anname `gen_code`-le oma search_path'i, kus on mõlemad skeemid.
-- Olematu skeem search_path'is on lihtsalt tühi koht, seega see töötab ka
-- baasis, kus pgcrypto on `public`-us.

begin;

create or replace function public.gen_code(p_len int) returns text
language plpgsql volatile set search_path = public, extensions as $$
declare chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; r text := ''; i int; b bytea;
begin
  b := gen_random_bytes(p_len);
  for i in 1..p_len loop
    r := r || substr(chars, 1 + (get_byte(b, i - 1) % 32), 1);
  end loop;
  return r;
end $$;
revoke execute on function public.gen_code(int) from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;

-- Kontroll pärast Run'i:
--   select create_group('team', null, null, null, 'Kontroll');
-- peab tagastama koodi. Kood on 6 märki tähestikust ABCDEFGHJKLMNPQRSTUVWXYZ23456789.
