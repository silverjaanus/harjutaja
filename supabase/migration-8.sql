-- Harjutaja · migratsioon 8: „midagi on valesti" jõuab Silverini
-- Kleebi tervikuna Supabase'i SQL Editorisse ja vajuta Run.
--
-- Miks: Kirjutaja `?` nupp märgib sõna ära, aga märge jääb sellesse
-- brauserisse. Kui Mia harjutab oma telefonis, ei jõua see kellelegi.
-- Laps ei kirjuta kirja ega täida vormi — tagasiside peab olema üks
-- puudutus ja kontekst peab tulema kaasa ise.
--
-- Ohutus: uus tabel ja uus funktsioon, olemasolevat ei puudutata.
-- Märke tohib saata ka laps, kes ei ole üheski klassis — seepärast on
-- `p_player_id` valikuline. Kui mängija on teada ja salakood klapib,
-- salvestatakse hüüdnimi ja klassi nimi, et sama viga eri lastelt
-- oleks eristatav.

begin;

-- ---------- 1. tabel ----------
create table if not exists public.issues (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  module      text not null,
  kind        text not null,          -- 'sona' | 'ulesanne' | 'muu'
  item        text,                   -- sõna id või ülesande võti
  detail      text,                   -- sõna ja lause, või ülesande tekst
  note        text,                   -- vaba märkus, kui keegi kirjutas
  player_id   uuid references public.players(id) on delete set null,
  nick        text,
  class_name  text,
  app_version text,
  done        boolean not null default false
);

alter table public.issues drop constraint if exists issues_module_chk;
alter table public.issues add constraint issues_module_chk
  check (module in ('korrutaja', 'kirjutaja', 'kell', 'keel', 'teisendaja'));

alter table public.issues drop constraint if exists issues_kind_chk;
alter table public.issues add constraint issues_kind_chk
  check (kind in ('sona', 'ulesanne', 'muu'));

create index if not exists issues_open_time on public.issues(done, created_at desc);

-- Kliendil ei ole tabelile otsest ligipääsu; kogu liiklus käib RPC kaudu.
alter table public.issues enable row level security;
revoke all on public.issues from anon, authenticated;

-- ---------- 2. märke saatmine ----------
-- Tagastab alati jsonb. Sama märget kaks korda ei salvestata: kui sama
-- mängija (või sama seade ilma mängijata) saadab sama mooduli sama item'i
-- uuesti, jääb esimene kirje alles ja vastuseks tuleb {"ok":true}.
create or replace function public.report_issue(
  p_module    text,
  p_kind      text,
  p_item      text default null,
  p_detail    text default null,
  p_note      text default null,
  p_player_id uuid default null,
  p_secret    text default null,
  p_version   text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_p players%rowtype;
  v_nick text := null;
  v_class text := null;
  v_id uuid := null;
  v_cnt int;
begin
  if p_module is null or p_module not in ('korrutaja', 'kirjutaja', 'kell', 'keel', 'teisendaja') then
    return jsonb_build_object('error', 'input');
  end if;
  if p_kind is null or p_kind not in ('sona', 'ulesanne', 'muu') then
    return jsonb_build_object('error', 'input');
  end if;

  -- Mängija on valikuline. Vale salakood ei ole viga — märge läheb lihtsalt
  -- nimeta kirja, sest lapse tagasiside on tähtsam kui tema tuvastamine.
  if p_player_id is not null and p_secret is not null then
    select * into v_p from players where id = p_player_id and secret = p_secret;
    if found then
      v_id := v_p.id;
      v_nick := v_p.nick;
      select name into v_class from classes where id = v_p.class_id;
    end if;
  end if;

  -- Lihtne kiiruspiirang, et katkine klient või naljahammas ei täidaks tabelit.
  if v_id is not null then
    select count(*) into v_cnt from issues
      where player_id = v_id and created_at > now() - interval '1 day';
    if v_cnt >= 50 then return jsonb_build_object('error', 'liiga_palju'); end if;
  else
    select count(*) into v_cnt from issues
      where player_id is null and created_at > now() - interval '1 hour';
    if v_cnt >= 100 then return jsonb_build_object('error', 'liiga_palju'); end if;
  end if;

  -- Sama asja kohta ei tule teist rida.
  if p_item is not null and exists (
       select 1 from issues
        where module = p_module and item = left(p_item, 200) and done = false
          and (player_id is not distinct from v_id)) then
    return jsonb_build_object('ok', true, 'kordus', true);
  end if;

  insert into issues (module, kind, item, detail, note, player_id, nick, class_name, app_version)
  values (p_module, p_kind, left(p_item, 200), left(p_detail, 500), left(p_note, 1000),
          v_id, v_nick, v_class, left(p_version, 40));

  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.report_issue(text, text, text, text, text, uuid, text, text) to anon;

-- PostgREST peab uue allkirja sisse lugema.
notify pgrst, 'reload schema';

commit;

-- Kontroll pärast Run'i:
--   select report_issue('kirjutaja', 'sona', 'proov-1', 'kapp / Kapp on suur.');
-- peab tagastama {"ok": true}. Märked ise:
--   select created_at, module, kind, item, detail, nick, class_name
--     from issues where done = false order by created_at desc;
-- Tehtud märke saab ära märkida:
--   update issues set done = true where id = <id>;
