-- Harjutaja · migratsioon 6: andmebaas hakkab mooduleid eristama
-- Kleebi tervikuna Supabase'i SQL Editorisse ja vajuta Run.
--
-- Miks: seni eeldas skeem, et mängib ainult Korrutaja. Kirjutaja võistlus
-- vajab oma edetabeleid ja oma „üks kord päevas" reeglit, aga sama klassi ja
-- sama mängijat. Seepärast saab iga võistlusring mooduli nime ja mooduli
-- kokkuvõte elab omaette tabelis, mitte uute veergudena players peal.
--
-- Ohutus: ükski rida ei kustu. Uued funktsiooniallkirjad annavad p_module'ile
-- vaikeväärtuse 'korrutaja', nii et vana index.html telefonides, mis seda
-- parameetrit ei saada, satub täpselt vanasse harusse. players tabeli vanad
-- veerud (greens_mul, greens_div, best_test, state) jäävad alles ja neid
-- uuendatakse Korrutaja puhul edasi, sest vana klient loeb neid edetabelist.

begin;

-- ---------- 1. igal ringil on moodul ----------
alter table public.sessions add column if not exists module text not null default 'korrutaja';

alter table public.sessions drop constraint if exists sessions_module_chk;
alter table public.sessions add constraint sessions_module_chk
  check (module in ('korrutaja', 'kirjutaja', 'kell', 'keel', 'teisendaja'));

create index if not exists sessions_mod_class_time  on public.sessions(module, class_id, created_at);
create index if not exists sessions_mod_player_time on public.sessions(module, player_id, created_at);

-- ---------- 2. mooduli kokkuvõte mängija kohta ----------
-- greens = mooduli oma „selge" loendur (Korrutajal rohelised tehted,
-- Kirjutajal selgeks saadud sõnad). state = mooduli edenemise varukoopia.
create table if not exists public.player_modules (
  player_id  uuid not null references public.players(id) on delete cascade,
  module     text not null,
  greens     int  not null default 0,
  total_n    int  not null default 0,
  total_ok   int  not null default 0,
  state      jsonb,
  updated_at timestamptz not null default now(),
  primary key (player_id, module)
);

alter table public.player_modules enable row level security;
revoke all on public.player_modules from anon, authenticated;

-- Olemasolevad mängijad saavad Korrutaja rea, et edetabel ei alustaks nullist.
insert into public.player_modules (player_id, module, greens, total_n, total_ok, state)
select id, 'korrutaja', greens_mul + greens_div, total_answers, total_correct, state
  from public.players
on conflict (player_id, module) do nothing;

-- ---------- 3. kas mängija on täna selles moodulis võistelnud ----------
-- Vana ühe parameetriga versioon tuleb maha võtta, muidu jääks kutse
-- competed_today(id) kahe kandidaadi vahel mitmetimõistetavaks.
drop function if exists public.competed_today(uuid);

create or replace function public.competed_today(p_player uuid, p_module text default 'korrutaja')
returns boolean language sql stable as $$
  select exists (
    select 1 from sessions
     where player_id = p_player and mode = 'test'
       and module = coalesce(p_module, 'korrutaja')
       and (created_at at time zone 'Europe/Tallinn')::date = (now() at time zone 'Europe/Tallinn')::date
  )
$$;
revoke execute on function public.competed_today(uuid, text) from public, anon, authenticated;

-- ---------- 4. report_session saab mooduli ----------
drop function if exists public.report_session(uuid, text, text, text, int, int, int, real, int, int, int, jsonb);

create or replace function public.report_session(
  p_player_id uuid, p_secret text, p_mode text, p_op text,
  p_n int, p_ok int, p_score int, p_avg real,
  p_greens_mul int, p_greens_div int, p_best_test int, p_state jsonb,
  p_module text default 'korrutaja', p_greens int default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_p players%rowtype;
  v_mod text := coalesce(p_module, 'korrutaja');
  v_greens int;
begin
  select * into v_p from players where id = p_player_id and secret = p_secret;
  if not found then return jsonb_build_object('error', 'auth'); end if;

  if v_mod not in ('korrutaja', 'kirjutaja', 'kell', 'keel', 'teisendaja') then
    return jsonb_build_object('error', 'input');
  end if;
  if p_mode not in ('train', 'test') then return jsonb_build_object('error', 'input'); end if;
  -- Korrutaja nimekiri jääb kitsaks; teistel moodulitel on teemarühma nimi vaba,
  -- aga kujuga piiratud, et kirjaviga ei looks vaikselt uut edetabelit.
  if v_mod = 'korrutaja' then
    if p_op not in ('mul', 'div', 'mix') then return jsonb_build_object('error', 'input'); end if;
  else
    if p_op is null or p_op !~ '^[a-z_]{2,16}$' then return jsonb_build_object('error', 'input'); end if;
  end if;
  if p_n is null or p_n < 1 or p_n > 300 or p_ok is null or p_ok < 0 or p_ok > p_n then
    return jsonb_build_object('error', 'input');
  end if;
  if p_state is not null and pg_column_size(p_state) > 300000 then return jsonb_build_object('error', 'input'); end if;

  -- Korrutaja saadab rohelised kahes numbris, teised moodulid ühes.
  if v_mod = 'korrutaja' then
    v_greens := greatest(0, least(coalesce(p_greens_mul, 0), 55)) + greatest(0, least(coalesce(p_greens_div, 0), 55));
  else
    v_greens := greatest(0, least(coalesce(p_greens, 0), 5000));
  end if;

  -- Võistelda saab üks kord Eesti kalendripäevas, iga mooduli kohta eraldi.
  -- Harjutusring salvestub ikka.
  if p_mode = 'test' and competed_today(v_p.id, v_mod) then
    insert into player_modules (player_id, module, greens, state)
    values (v_p.id, v_mod, v_greens, p_state)
    on conflict (player_id, module) do update set
      greens = excluded.greens,
      state = coalesce(excluded.state, player_modules.state),
      updated_at = now();

    if v_mod = 'korrutaja' then
      update players set
        greens_mul = greatest(0, least(coalesce(p_greens_mul, 0), 55)),
        greens_div = greatest(0, least(coalesce(p_greens_div, 0), 55)),
        state      = coalesce(p_state, state),
        last_seen  = now()
      where id = v_p.id;
    else
      update players set last_seen = now() where id = v_p.id;
    end if;
    return jsonb_build_object('error', 'done_today');
  end if;

  insert into sessions(player_id, class_id, module, mode, op, n, ok, score, avg_t)
  values (v_p.id, v_p.class_id, v_mod, p_mode, p_op, p_n, p_ok,
          greatest(0, least(coalesce(p_score, 0), 10000)), p_avg);

  insert into player_modules (player_id, module, greens, total_n, total_ok, state)
  values (v_p.id, v_mod, v_greens, p_n, p_ok, p_state)
  on conflict (player_id, module) do update set
    greens     = excluded.greens,
    total_n    = player_modules.total_n + excluded.total_n,
    total_ok   = player_modules.total_ok + excluded.total_ok,
    state      = coalesce(excluded.state, player_modules.state),
    updated_at = now();

  -- players vanad veerud jäävad Korrutaja jaoks elama, sest vana klient loeb neid.
  -- Rekord võetakse alati serveri enda sessions-tabelist, mitte kliendi numbrist.
  if v_mod = 'korrutaja' then
    update players set
      greens_mul    = greatest(0, least(coalesce(p_greens_mul, 0), 55)),
      greens_div    = greatest(0, least(coalesce(p_greens_div, 0), 55)),
      best_test     = coalesce((select max(ok) from sessions
                                  where player_id = v_p.id and mode = 'test' and module = 'korrutaja'), best_test),
      total_answers = total_answers + p_n,
      total_correct = total_correct + p_ok,
      state         = coalesce(p_state, state),
      last_seen     = now()
    where id = v_p.id;
  else
    update players set last_seen = now() where id = v_p.id;
  end if;

  return jsonb_build_object('ok', true, 'module', v_mod,
                            'competed_today', competed_today(v_p.id, v_mod));
end $$;

grant execute on function public.report_session(uuid, text, text, text, int, int, int, real, int, int, int, jsonb, text, int) to anon;

-- ---------- 5. class_board mooduli kaupa ----------
drop function if exists public.class_board(uuid, text);

create or replace function public.class_board(p_player_id uuid, p_secret text, p_module text default 'korrutaja')
returns jsonb
language plpgsql security definer set search_path = public set client_min_messages = warning as $$
declare
  v_p players%rowtype; v_ws timestamptz := week_start();
  v_c classes%rowtype;
  v_mod text := coalesce(p_module, 'korrutaja');
  v_players jsonb; v_class jsonb; v_classes jsonb;
  v_siblings jsonb := '[]'::jsonb; v_peers jsonb := '[]'::jsonb;
begin
  select * into v_p from players where id = p_player_id and secret = p_secret;
  if not found then return jsonb_build_object('error', 'auth'); end if;
  if v_mod not in ('korrutaja', 'kirjutaja', 'kell', 'keel', 'teisendaja') then
    return jsonb_build_object('error', 'input');
  end if;
  update players set last_seen = now() where id = v_p.id;
  select * into v_c from classes where id = v_p.class_id;

  drop table if exists _daily; drop table if exists _pw;
  drop table if exists _cw;    drop table if exists _best;

  -- Selle nädala võistluspäevad selles moodulis: mängija-päeva parim tulemus.
  create temp table _daily on commit drop as
    select s.player_id, p.class_id,
           (s.created_at at time zone 'Europe/Tallinn')::date as d,
           max(s.ok) as best
      from sessions s join players p on p.id = s.player_id
     where s.mode = 'test' and s.module = v_mod and s.created_at >= v_ws
     group by s.player_id, p.class_id, (s.created_at at time zone 'Europe/Tallinn')::date;

  create temp table _pw on commit drop as
    with r as (
      select player_id, class_id, best,
             row_number() over (partition by player_id order by best desc) as rn
        from _daily)
    select player_id, class_id,
           coalesce(sum(best) filter (where rn <= 5), 0)::int as week_n,
           count(*)::int as days
      from r group by player_id, class_id;

  create temp table _cw on commit drop as
    select class_id, sum(week_n)::int as week_n, count(*)::int as active
      from _pw group by class_id;

  -- Rekord: parim üksik võistlus selles moodulis, ainult oma klassi mängijatele.
  create temp table _best on commit drop as
    select s.player_id, max(s.ok)::int as best
      from sessions s join players p on p.id = s.player_id
     where s.mode = 'test' and s.module = v_mod and p.class_id = v_p.class_id
     group by s.player_id;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_players from (
    select jsonb_build_object(
      'id', p.id, 'nick', p.nick,
      'greens', case when v_mod = 'korrutaja' then p.greens_mul + p.greens_div
                     else coalesce(pm.greens, 0) end,
      'greens_mul', p.greens_mul, 'greens_div', p.greens_div,
      'best_test', coalesce(b.best, 0),
      'total_n', case when v_mod = 'korrutaja' then p.total_answers
                      else coalesce(pm.total_n, 0) end,
      'week_n', coalesce(pw.week_n, 0),
      'days', coalesce(pw.days, 0)
    ) as x
    from players p
    left join _pw pw on pw.player_id = p.id
    left join _best b on b.player_id = p.id
    left join player_modules pm on pm.player_id = p.id and pm.module = v_mod
    where p.class_id = v_p.class_id
  ) q;

  select jsonb_build_object(
    'id', c.id, 'name', c.name, 'code', c.code, 'kind', c.kind,
    'school', c.school, 'grade', c.grade, 'letter', c.grade_letter,
    'week_n', coalesce(cw.week_n, 0), 'active_week', coalesce(cw.active, 0),
    'total_n', coalesce((select sum(n) from sessions where class_id = c.id and module = v_mod), 0),
    'players', (select count(*) from players where class_id = c.id)
  ) into v_class from classes c left join _cw cw on cw.class_id = c.id where c.id = v_p.class_id;

  -- vana võti, et vana index.html ei katkeks
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_classes from (
    select jsonb_build_object('id', c.id, 'name', c.name, 'week_n', cw.week_n, 'active', cw.active,
                              'per_player', round(cw.week_n::numeric / greatest(cw.active, 1))) as x
    from classes c join _cw cw on cw.class_id = c.id
    where cw.active > 0
    order by (cw.week_n::numeric / greatest(cw.active, 1)) desc
    limit 20
  ) q;

  if v_c.kind = 'class' and v_c.grade is not null then
    select coalesce(jsonb_agg(x), '[]'::jsonb) into v_siblings from (
      select jsonb_build_object(
        'id', c.id, 'name', coalesce(c.grade::text, '') || coalesce(c.grade_letter, ''),
        'week_n', coalesce(cw.week_n, 0), 'active', coalesce(cw.active, 0),
        'per_player', round(coalesce(cw.week_n, 0)::numeric / greatest(coalesce(cw.active, 0), 1))) as x
      from classes c left join _cw cw on cw.class_id = c.id
      where c.kind = 'class' and c.school_key = v_c.school_key and c.grade = v_c.grade
      order by coalesce(cw.week_n, 0)::numeric / greatest(coalesce(cw.active, 0), 1) desc, c.name
      limit 20
    ) q;

    select coalesce(jsonb_agg(x), '[]'::jsonb) into v_peers from (
      select jsonb_build_object(
        'id', c.id, 'name', c.name, 'school', c.school,
        'week_n', coalesce(cw.week_n, 0), 'active', coalesce(cw.active, 0),
        'per_player', round(coalesce(cw.week_n, 0)::numeric / greatest(coalesce(cw.active, 0), 1))) as x
      from classes c left join _cw cw on cw.class_id = c.id
      where c.kind = 'class' and c.grade = v_c.grade
      order by coalesce(cw.week_n, 0)::numeric / greatest(coalesce(cw.active, 0), 1) desc, c.name
      limit 20
    ) q;
  end if;

  drop table if exists _daily; drop table if exists _pw;
  drop table if exists _cw;    drop table if exists _best;

  return jsonb_build_object('me', v_p.id, 'module', v_mod, 'week_start', v_ws, 'class', v_class,
                            'players', v_players, 'classes', v_classes,
                            'siblings', v_siblings, 'peers', v_peers,
                            'competed_today', competed_today(v_p.id, v_mod));
end $$;

grant execute on function public.class_board(uuid, text, text) to anon;

-- PostgREST peab uued allkirjad uuesti sisse lugema.
notify pgrst, 'reload schema';

commit;

-- Valmis. Mis pärast seda kehtib:
--   * iga võistlus- ja harjutusring kannab mooduli nime (vaikimisi 'korrutaja')
--   * „üks võistlus päevas" käib mooduli kohta eraldi
--   * class_board(p_module => 'kirjutaja') annab Kirjutaja edetabelid
--   * vana klient, kes p_module'it ei saada, näeb täpselt sama, mis enne
