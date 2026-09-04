-- Deylo Garage — schema Supabase complet
-- A executer une seule fois dans Supabase Dashboard > SQL Editor.
-- Compatible avec les donnees deja existantes dans `leaderboard` (name, score, car).

-- ============================================================
-- 1. PROFILS (comptes joueurs)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  money integer not null default 500,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists avatar_url text;

alter table public.profiles enable row level security;

-- Un joueur peut lire son propre profil. Personne ne peut lire les profils des autres
-- directement (evite d'exposer email/argent d'autrui). Le classement public passe par
-- la table leaderboard (qui ne contient pas d'email).
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Aucune policy insert/update/delete : toute mutation passe par les fonctions
-- SECURITY DEFINER ci-dessous, pour empecher un joueur de se donner de l'argent
-- ou de se promouvoir admin depuis le client.

-- Creation automatique du profil a l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_username text;
  v_avatar text;
begin
  -- Discord (et les autres fournisseurs OAuth) exposent le pseudo/avatar via
  -- raw_user_meta_data ; on retombe sur un pseudo genere si rien n'est fourni
  -- (ex: inscription email/mot de passe classique).
  v_username := left(coalesce(
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'preferred_username',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    'Pilote' || substr(new.id::text, 1, 4)
  ), 16);
  v_avatar := new.raw_user_meta_data->>'avatar_url';

  insert into public.profiles (id, username, money, avatar_url)
  values (new.id, v_username, 500, v_avatar)
  on conflict (id) do nothing;
  return new;
exception
  when unique_violation then
    -- Pseudo deja pris (collision Discord) : on ajoute un suffixe court.
    insert into public.profiles (id, username, money, avatar_url)
    values (new.id, left(v_username, 11) || '_' || substr(new.id::text, 1, 4), 500, v_avatar)
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. CATALOGUE DE VOITURES (source d'autorite cote serveur)
-- ============================================================
create table if not exists public.cars_catalog (
  id text primary key,
  price integer not null default 0
);

alter table public.cars_catalog enable row level security;
drop policy if exists "cars_catalog_select_all" on public.cars_catalog;
create policy "cars_catalog_select_all" on public.cars_catalog for select using (true);

insert into public.cars_catalog (id, price) values
  ('citadine', 0),
  ('kart', 800),
  ('compacte-sport', 2500),
  ('audi-a3', 4000),
  ('berline-sport', 5000),
  ('suv', 6500),
  ('golf-r', 7500),
  ('suv-luxe', 12000),
  ('audi-a8', 13000),
  ('supra', 16000),
  ('m4-widebody', 20000),
  ('porsche-911', 34000),
  ('gt3', 25000),
  ('rs6-abt', 26000),
  ('huracan-performante', 45000),
  ('gt3-rs', 52000),
  ('aventador', 60000),
  ('812-competizione', 82000),
  ('aston-one77', 60000),
  ('aventador-svj', 92000),
  ('pagani-huayra-r', 88000),
  ('huayra-roadster', 65000),
  ('centenario', 120000),
  ('huayra-bc', 135000),
  ('daytona-sp3', 145000),
  ('pagani-imola', 210000),
  ('mclaren-p1', 220000),
  ('laferrari', 420000),
  ('gma-t50', 195000),
  ('aston-valhalla', 340000),
  ('revuelto', 280000),
  ('chiron', 110000),
  ('veyron-ettore', 95000),
  ('w16-mistral', 175000),
  ('centodieci', 230000),
  ('bolide', 520000)
on conflict (id) do update set price = excluded.price;

-- Voitures possedees par joueur (au-dela de la citadine offerte a tous)
create table if not exists public.player_cars (
  user_id uuid not null references public.profiles(id) on delete cascade,
  car_id text not null references public.cars_catalog(id),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, car_id)
);

alter table public.player_cars enable row level security;
drop policy if exists "player_cars_select_own" on public.player_cars;
create policy "player_cars_select_own" on public.player_cars
  for select using (auth.uid() = user_id);

-- ============================================================
-- 3. CLASSEMENT (compatible avec l'existant : name, score, car)
-- ============================================================
-- Si la table existe deja (version precedente du jeu, colonnes name/score/car
-- seulement), on la complete plutot que la recreer : aucune donnee n'est perdue.
create table if not exists public.leaderboard (
  id bigserial primary key,
  name text not null,
  score integer not null,
  car text
);
-- Les voitures sont maintenant identifiees par un texte (ex: 'gt3') et non plus
-- un index numerique (0,1,2) : on convertit la colonne si besoin, sans perte.
alter table public.leaderboard alter column car type text using car::text;
alter table public.leaderboard add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.leaderboard add column if not exists time_seconds numeric;
alter table public.leaderboard add column if not exists route_id text;
alter table public.leaderboard add column if not exists created_at timestamptz not null default now();

-- Corrige un bug de production : sur les bases deja existantes (creees avant ce
-- fichier), la cle primaire de `leaderboard` portait sur `name` au lieu de `id`.
-- Consequence : des qu'un joueur (ou un invite) soumettait un 2e score avec le
-- meme pseudo, submit_run() echouait sur un doublon de cle primaire (erreur
-- Postgres 23505) juste apres l'insertion dans `leaderboard` — donc AVANT
-- d'atteindre l'insertion dans `game_sessions` et le credit des points dans
-- `profiles.money` : plus aucun score n'etait alors enregistre/mis a jour, et
-- les credits ne s'ajoutaient plus au portefeuille des joueurs connectes des
-- leur 2e partie. On remet la cle primaire sur `id` (append-only : chaque
-- partie garde sa propre ligne, comme le reste du code le suppose deja).
alter table public.leaderboard add column if not exists id bigserial;
do $$
declare
  v_pk_name text;
  v_pk_on_id boolean;
begin
  select c.conname,
         exists (
           select 1 from unnest(c.conkey) as k
           join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k
           where a.attname = 'id'
         )
    into v_pk_name, v_pk_on_id
  from pg_constraint c
  where c.conrelid = 'public.leaderboard'::regclass and c.contype = 'p';

  if v_pk_name is not null and not coalesce(v_pk_on_id, false) then
    execute format('alter table public.leaderboard drop constraint %I', v_pk_name);
    v_pk_name := null;
  end if;

  if v_pk_name is null then
    alter table public.leaderboard add primary key (id);
  end if;
end $$;

alter table public.leaderboard enable row level security;
drop policy if exists "leaderboard_select_all" on public.leaderboard;
create policy "leaderboard_select_all" on public.leaderboard for select using (true);
-- Pas de policy insert : uniquement via submit_run() ci-dessous.

create index if not exists leaderboard_score_idx on public.leaderboard (score desc);

-- ============================================================
-- 4. SESSIONS DE JEU (pour les stats admin)
-- ============================================================
create table if not exists public.game_sessions (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete set null,
  score integer not null,
  time_seconds numeric,
  car_id text,
  route_id text,
  credits_earned integer not null default 0,
  created_at timestamptz not null default now()
);
-- IP declaree par le client au moment de l'envoi du score (utile pour reperer les
-- comptes qui trichent/abusent) : jamais exposee au public, seulement a admin_list_sessions().
alter table public.game_sessions add column if not exists ip_address text;

alter table public.game_sessions enable row level security;
-- Pas de select public : les stats agregees passent par admin_stats().

-- ============================================================
-- 5. FONCTIONS DE JEU (SECURITY DEFINER : seules portes de mutation)
-- ============================================================

-- Soumet un score de fin de partie, alimente le classement + les stats,
-- et credite l'argent gagne si le joueur est connecte.
drop function if exists public.submit_run(text, integer, text, numeric, text);

create or replace function public.submit_run(
  p_name text, p_score integer, p_car text, p_time numeric, p_route text, p_ip text default null
) returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_credits integer;
begin
  if p_ip is not null and exists (select 1 from public.banned_ips where ip = p_ip) then
    raise exception 'Acces bloque.';
  end if;
  if p_score is null or p_score < 0 then p_score := 0; end if;
  v_credits := greatest(5, floor(p_score / 10.0)::integer);

  insert into public.leaderboard (user_id, name, score, car, time_seconds, route_id)
  values (v_uid, left(coalesce(p_name,'Pilote'), 20), p_score, p_car, p_time, p_route);

  insert into public.game_sessions (user_id, score, time_seconds, car_id, route_id, credits_earned, ip_address)
  values (v_uid, p_score, p_time, p_car, p_route, v_credits, left(coalesce(p_ip,''), 64));

  if v_uid is not null then
    update public.profiles set money = money + v_credits where id = v_uid;
  end if;

  return v_credits;
end;
$$;

grant execute on function public.submit_run(text, integer, text, numeric, text, text) to anon, authenticated;

-- Historique des parties avec IP, reserve a l'admin : sert a reperer les comptes
-- qui abusent (multi-compte, score suspect, etc.).
create or replace function public.admin_list_sessions(p_limit integer default 100)
returns table(
  id bigint, username text, score integer, time_seconds numeric, car_id text,
  route_id text, credits_earned integer, ip_address text, created_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
declare v_is_admin boolean;
begin
  select p.is_admin into v_is_admin from public.profiles p where p.id = auth.uid();
  if not coalesce(v_is_admin, false) then raise exception 'Acces refuse'; end if;
  return query
    select gs.id, coalesce(p.username, 'invite'), gs.score, gs.time_seconds, gs.car_id,
           gs.route_id, gs.credits_earned, gs.ip_address, gs.created_at
    from public.game_sessions gs
    left join public.profiles p on p.id = gs.user_id
    order by gs.created_at desc
    limit greatest(1, least(500, coalesce(p_limit, 100)));
end;
$$;

grant execute on function public.admin_list_sessions(integer) to authenticated;

-- Achete/debloque une voiture pour le joueur connecte (verifie le prix cote serveur).
create or replace function public.claim_car(p_car_id text)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_price integer;
  v_money integer;
begin
  if v_uid is null then raise exception 'Connexion requise'; end if;
  select price into v_price from public.cars_catalog where id = p_car_id;
  if v_price is null then raise exception 'Voiture inconnue'; end if;

  select money into v_money from public.profiles where id = v_uid for update;
  if v_money < v_price then raise exception 'Argent insuffisant'; end if;

  insert into public.player_cars (user_id, car_id) values (v_uid, p_car_id)
  on conflict do nothing;

  update public.profiles set money = money - v_price where id = v_uid returning money into v_money;
  return v_money;
end;
$$;

grant execute on function public.claim_car(text) to authenticated;

-- Recompense de publicite volontaire (rate-limitee a 1 fois / 60s / joueur).
create or replace function public.claim_ad_reward()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_last timestamptz;
  v_money integer;
  v_reward constant integer := 150;
begin
  if v_uid is null then raise exception 'Connexion requise'; end if;
  select created_at into v_last from public.ad_views where user_id = v_uid order by created_at desc limit 1;
  if v_last is not null and now() - v_last < interval '60 seconds' then
    raise exception 'Trop tot, reessayez dans un instant';
  end if;

  insert into public.ad_views (user_id, reward_credits) values (v_uid, v_reward);
  update public.profiles set money = money + v_reward where id = v_uid returning money into v_money;
  return v_money;
end;
$$;

grant execute on function public.claim_ad_reward() to authenticated;

create table if not exists public.ad_views (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  reward_credits integer not null,
  created_at timestamptz not null default now()
);
alter table public.ad_views enable row level security;
-- pas de select/insert direct : uniquement via claim_ad_reward()

-- Met a jour le pseudo (unique) du joueur connecte.
create or replace function public.update_username(p_username text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  update public.profiles set username = left(trim(p_username), 16) where id = auth.uid();
end;
$$;

grant execute on function public.update_username(text) to authenticated;

-- ============================================================
-- 6. STATISTIQUES PUBLIQUES (page d'accueil) + ADMIN
-- ============================================================
create or replace function public.get_public_stats()
returns json
language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'players', (select count(*) from public.profiles),
    'games_played', (select count(*) from public.game_sessions),
    'top_score', (select coalesce(max(score),0) from public.leaderboard)
  );
$$;

grant execute on function public.get_public_stats() to anon, authenticated;

-- Reserve aux comptes avec profiles.is_admin = true (a activer manuellement
-- dans Supabase Studio : update profiles set is_admin = true where id = '...';)
create or replace function public.admin_stats()
returns json
language plpgsql stable security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = v_uid;
  if not coalesce(v_is_admin, false) then raise exception 'Acces refuse'; end if;

  return (
    select json_build_object(
      'players', (select count(*) from public.profiles),
      'accounts_last_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
      'games_played', (select count(*) from public.game_sessions),
      'total_playtime_hours', (select round(coalesce(sum(time_seconds),0)/3600.0, 1) from public.game_sessions),
      'top_score', (select coalesce(max(score),0) from public.leaderboard),
      'music_suggestions_pending', (select count(*) from public.music_suggestions where status = 'pending'),
      'cars_usage', (select coalesce(json_agg(row_to_json(t)),'[]'::json) from (
        select car_id, count(*) as plays from public.game_sessions group by car_id order by plays desc
      ) t),
      'routes_usage', (select coalesce(json_agg(row_to_json(t)),'[]'::json) from (
        select route_id, count(*) as plays from public.game_sessions where route_id is not null group by route_id order by plays desc
      ) t),
      'signups_per_day', (select coalesce(json_agg(row_to_json(t)),'[]'::json) from (
        select date_trunc('day', created_at)::date as day, count(*) as accounts
        from public.profiles group by 1 order by 1 desc limit 14
      ) t)
    )
  );
end;
$$;

grant execute on function public.admin_stats() to authenticated;

-- Liste des comptes joueurs pour l'admin. Ne renvoie jamais l'email ni le mot de
-- passe : les mots de passe ne sont JAMAIS stockes en clair (Supabase Auth les hashe
-- avec bcrypt), personne — y compris l'admin — ne peut les consulter. C'est voulu et
-- protege les joueurs.
create or replace function public.admin_list_players()
returns table(id uuid, username text, money integer, is_admin boolean, created_at timestamptz, cars_unlocked bigint, best_score integer)
language plpgsql stable security definer set search_path = public
as $$
declare v_is_admin boolean;
begin
  select p.is_admin into v_is_admin from public.profiles p where p.id = auth.uid();
  if not coalesce(v_is_admin, false) then raise exception 'Acces refuse'; end if;
  return query
    select
      p.id, p.username, p.money, p.is_admin, p.created_at,
      (select count(*) from public.player_cars pc where pc.user_id = p.id),
      (select max(l.score) from public.leaderboard l where l.user_id = p.id)
    from public.profiles p
    order by p.created_at desc;
end;
$$;

grant execute on function public.admin_list_players() to authenticated;

-- ============================================================
-- 7. RADIO (pistes gerees par l'admin + suggestions des joueurs)
-- ============================================================
create table if not exists public.music_tracks (
  id bigserial primary key,
  title text not null,
  artist text,
  url text not null,
  active boolean not null default true,
  added_at timestamptz not null default now()
);

alter table public.music_tracks enable row level security;
drop policy if exists "music_tracks_select_active" on public.music_tracks;
create policy "music_tracks_select_active" on public.music_tracks for select using (active = true);

create table if not exists public.music_suggestions (
  id bigserial primary key,
  title text not null,
  artist text,
  link text,
  submitted_by text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.music_suggestions enable row level security;
drop policy if exists "music_suggestions_insert_all" on public.music_suggestions;
create policy "music_suggestions_insert_all" on public.music_suggestions for insert with check (true);
-- pas de select public : uniquement consultees par l'admin via la fonction ci-dessous.

create or replace function public.admin_list_suggestions()
returns setof public.music_suggestions
language plpgsql stable security definer set search_path = public
as $$
declare v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then raise exception 'Acces refuse'; end if;
  return query select * from public.music_suggestions order by created_at desc;
end;
$$;

grant execute on function public.admin_list_suggestions() to authenticated;

create or replace function public.admin_add_track(p_title text, p_artist text, p_url text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then raise exception 'Acces refuse'; end if;
  insert into public.music_tracks (title, artist, url) values (p_title, p_artist, p_url);
end;
$$;

grant execute on function public.admin_add_track(text, text, text) to authenticated;

create or replace function public.admin_set_track_active(p_id bigint, p_active boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then raise exception 'Acces refuse'; end if;
  update public.music_tracks set active = p_active where id = p_id;
end;
$$;

grant execute on function public.admin_set_track_active(bigint, boolean) to authenticated;

-- ============================================================
-- 8. STORAGE (bucket pour les MP3 uploades par l'admin)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('radio', 'radio', true)
on conflict (id) do nothing;

drop policy if exists "radio_public_read" on storage.objects;
create policy "radio_public_read" on storage.objects
  for select using (bucket_id = 'radio');

drop policy if exists "radio_admin_write" on storage.objects;
create policy "radio_admin_write" on storage.objects
  for insert with check (
    bucket_id = 'radio'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "radio_admin_delete" on storage.objects;
create policy "radio_admin_delete" on storage.objects
  for delete using (
    bucket_id = 'radio'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ============================================================
-- 8. CODES PROMO (l'admin cree un code, un joueur connecte le saisit une fois)
-- ============================================================
create table if not exists public.promo_codes (
  code text primary key,
  car_id text references public.cars_catalog(id),
  credits integer not null default 0,
  max_redemptions integer,
  redemption_count integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.promo_codes enable row level security;
-- Pas de policy select/insert publique : uniquement via les fonctions ci-dessous.

create table if not exists public.promo_code_redemptions (
  id bigserial primary key,
  code text not null references public.promo_codes(code) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique(code, user_id)
);
alter table public.promo_code_redemptions enable row level security;

create or replace function public.redeem_code(p_code text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(p_code));
  v_row public.promo_codes%rowtype;
begin
  if v_uid is null then raise exception 'Connecte-toi pour utiliser un code.'; end if;

  select * into v_row from public.promo_codes where code = v_code and active = true for update;
  if not found then raise exception 'Code invalide.'; end if;
  if v_row.max_redemptions is not null and v_row.redemption_count >= v_row.max_redemptions then
    raise exception 'Ce code a atteint sa limite d''utilisation.';
  end if;
  if exists (select 1 from public.promo_code_redemptions where code = v_code and user_id = v_uid) then
    raise exception 'Vous avez deja utilise ce code.';
  end if;

  insert into public.promo_code_redemptions (code, user_id) values (v_code, v_uid);
  update public.promo_codes set redemption_count = redemption_count + 1 where code = v_code;

  if v_row.credits > 0 then
    update public.profiles set money = money + v_row.credits where id = v_uid;
  end if;
  if v_row.car_id is not null then
    insert into public.player_cars (user_id, car_id) values (v_uid, v_row.car_id) on conflict do nothing;
  end if;

  return jsonb_build_object('credits', v_row.credits, 'car_id', v_row.car_id);
end;
$$;

grant execute on function public.redeem_code(text) to authenticated;

create or replace function public.admin_create_code(
  p_code text, p_car_id text default null, p_credits integer default 0, p_max_redemptions integer default null
) returns void
language plpgsql security definer set search_path = public
as $$
declare v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then raise exception 'Acces refuse'; end if;
  if p_code is null or length(trim(p_code)) = 0 then raise exception 'Code vide'; end if;

  insert into public.promo_codes (code, car_id, credits, max_redemptions, active)
  values (upper(trim(p_code)), p_car_id, coalesce(p_credits,0), p_max_redemptions, true)
  on conflict (code) do update set
    car_id = excluded.car_id, credits = excluded.credits,
    max_redemptions = excluded.max_redemptions, active = true;
end;
$$;

grant execute on function public.admin_create_code(text, text, integer, integer) to authenticated;

create or replace function public.admin_set_code_active(p_code text, p_active boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then raise exception 'Acces refuse'; end if;
  update public.promo_codes set active = p_active where code = upper(trim(p_code));
end;
$$;

grant execute on function public.admin_set_code_active(text, boolean) to authenticated;

create or replace function public.admin_list_codes()
returns setof public.promo_codes
language plpgsql stable security definer set search_path = public
as $$
declare v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then raise exception 'Acces refuse'; end if;
  return query select * from public.promo_codes order by created_at desc;
end;
$$;

grant execute on function public.admin_list_codes() to authenticated;

-- ============================================================
-- 8bis. IP BANNIES (anti-triche/abus) : reutilise l'IP declaree par le client
-- au moment de submit_run() (voir game_sessions.ip_address) — meme limite
-- deja acceptee ailleurs dans ce fichier : c'est une IP auto-declaree, pas
-- verifiee au niveau reseau, mais suffisante pour couper court a un joueur
-- identifie qui abuse (multi-compte, score farming, etc.).
-- ============================================================
create table if not exists public.banned_ips (
  ip text primary key,
  reason text,
  banned_by uuid references public.profiles(id) on delete set null,
  banned_at timestamptz not null default now()
);
alter table public.banned_ips enable row level security;
-- Pas de policy publique : uniquement via les fonctions admin ci-dessous.

create or replace function public.admin_ban_ip(p_ip text, p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then raise exception 'Acces refuse'; end if;
  if p_ip is null or length(trim(p_ip)) = 0 then raise exception 'IP invalide'; end if;
  insert into public.banned_ips (ip, reason, banned_by) values (trim(p_ip), nullif(trim(coalesce(p_reason,'')),''), auth.uid())
  on conflict (ip) do update set reason = excluded.reason, banned_by = excluded.banned_by, banned_at = now();
end;
$$;

grant execute on function public.admin_ban_ip(text, text) to authenticated;

create or replace function public.admin_unban_ip(p_ip text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then raise exception 'Acces refuse'; end if;
  delete from public.banned_ips where ip = trim(p_ip);
end;
$$;

grant execute on function public.admin_unban_ip(text) to authenticated;

create or replace function public.admin_list_banned_ips()
returns table(ip text, reason text, banned_by_username text, banned_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
declare v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then raise exception 'Acces refuse'; end if;
  return query
    select b.ip, b.reason, p.username, b.banned_at
    from public.banned_ips b
    left join public.profiles p on p.id = b.banned_by
    order by b.banned_at desc;
end;
$$;

grant execute on function public.admin_list_banned_ips() to authenticated;

-- ============================================================
-- 9. DEFI DU JOUR (voiture imposee + objectif, changent chaque jour, memes pour
-- tout le monde). La voiture/l'objectif sont recalcules ici plutot que stockes,
-- via la meme formule deterministe que DG.dailyChallenge() cote client (js/cars.js).
-- IMPORTANT : si tu ajoutes une voiture dans js/cars.js, ajoute son id ici aussi,
-- exactement a la meme position dans la liste.
-- ============================================================
create table if not exists public.daily_challenge_claims (
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_day integer not null,
  score integer not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, challenge_day)
);
alter table public.daily_challenge_claims enable row level security;
-- Pas de policy select/insert publique : uniquement via les fonctions ci-dessous.

create or replace function public.claim_daily_challenge(p_score integer, p_car_id text, p_time numeric default null)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_days integer := floor(extract(epoch from now()) / 86400)::integer;
  v_ids text[] := array['citadine','audi-a3','golf-r','audi-a8','supra','m4-widebody','porsche-911','rs6-abt','huracan-performante','gt3-rs','812-competizione','aston-one77','aventador-svj','pagani-huayra-r','huayra-roadster','centenario','huayra-bc','daytona-sp3','pagani-imola','mclaren-p1','laferrari','gma-t50','aston-valhalla','revuelto','chiron','veyron-ettore','w16-mistral','centodieci','bolide'];
  v_car_id text;
  v_target integer;
  v_reward integer := 250;
begin
  if v_uid is null then raise exception 'Connecte-toi pour reclamer le defi du jour.'; end if;
  v_car_id := v_ids[(v_days % array_length(v_ids,1)) + 1];
  v_target := 300 + (v_days % 5) * 50;
  if p_car_id <> v_car_id then raise exception 'Ce n''est pas la voiture du defi du jour.'; end if;
  if p_score < v_target then raise exception 'Score insuffisant pour le defi du jour.'; end if;
  if exists (select 1 from public.daily_challenge_claims where user_id = v_uid and challenge_day = v_days) then
    raise exception 'Defi du jour deja reclame.';
  end if;

  insert into public.daily_challenge_claims (user_id, challenge_day, score) values (v_uid, v_days, p_score);
  update public.profiles set money = money + v_reward where id = v_uid;
  return v_reward;
end;
$$;

grant execute on function public.claim_daily_challenge(integer, text, numeric) to authenticated;

create or replace function public.has_claimed_daily_challenge()
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_days integer := floor(extract(epoch from now()) / 86400)::integer;
begin
  if v_uid is null then return false; end if;
  return exists (select 1 from public.daily_challenge_claims where user_id = v_uid and challenge_day = v_days);
end;
$$;

grant execute on function public.has_claimed_daily_challenge() to authenticated;

-- ============================================================
-- 9bis. TIRAGE QUOTIDIEN (loterie gratuite, 1x/jour) : credits raisonnables la
-- plupart du temps, et une chance infime (1%) de gagner directement une
-- voiture rare/couteuse (aussi dure a obtenir qu'une SVJ).
-- ============================================================
create table if not exists public.daily_draw_claims (
  user_id uuid not null references public.profiles(id) on delete cascade,
  draw_day integer not null,
  reward_credits integer not null default 0,
  reward_car_id text,
  claimed_at timestamptz not null default now(),
  primary key (user_id, draw_day)
);
alter table public.daily_draw_claims enable row level security;
-- Pas de policy select/insert publique : uniquement via les fonctions ci-dessous.

create or replace function public.claim_daily_draw()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_days integer := floor(extract(epoch from now()) / 86400)::integer;
  v_roll numeric := random();
  v_credits integer := 0;
  v_car_id text;
  -- Lot "voiture rare" : tier hypercar d'entree/milieu de gamme, difficile a
  -- obtenir autrement sans y avoir deja mis le prix (ex: Aventador SVJ).
  v_jackpot_ids text[] := array['aventador-svj','gt3-rs','812-competizione','huracan-performante','pagani-huayra-r'];
  v_pick text;
begin
  if v_uid is null then raise exception 'Connecte-toi pour tenter le tirage du jour.'; end if;
  if exists (select 1 from public.daily_draw_claims where user_id = v_uid and draw_day = v_days) then
    raise exception 'Tirage du jour deja tente.';
  end if;

  if v_roll < 0.01 then
    select id into v_pick from unnest(v_jackpot_ids) as id
      where id not in (select car_id from public.player_cars where user_id = v_uid)
      order by random() limit 1;
    if v_pick is not null then
      v_car_id := v_pick;
      insert into public.player_cars (user_id, car_id) values (v_uid, v_car_id) on conflict do nothing;
    else
      v_credits := 5000; -- deja tout debloque parmi les lots : gros bonus credits a la place
    end if;
  elsif v_roll < 0.05 then v_credits := 1500;
  elsif v_roll < 0.15 then v_credits := 700;
  elsif v_roll < 0.45 then v_credits := 300;
  else v_credits := 120;
  end if;

  insert into public.daily_draw_claims (user_id, draw_day, reward_credits, reward_car_id)
    values (v_uid, v_days, v_credits, v_car_id);
  if v_credits > 0 then
    update public.profiles set money = money + v_credits where id = v_uid;
  end if;

  return jsonb_build_object('credits', v_credits, 'car_id', v_car_id);
end;
$$;

grant execute on function public.claim_daily_draw() to authenticated;

create or replace function public.has_claimed_daily_draw()
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_days integer := floor(extract(epoch from now()) / 86400)::integer;
begin
  if v_uid is null then return false; end if;
  return exists (select 1 from public.daily_draw_claims where user_id = v_uid and draw_day = v_days);
end;
$$;

grant execute on function public.has_claimed_daily_draw() to authenticated;

-- ============================================================
-- 10. STATS PERSONNELLES (pour les succes/trophees, compte connecte)
-- ============================================================
create or replace function public.my_stats()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_games integer;
  v_best integer;
  v_cars integer;
  v_records integer;
  v_daily integer;
begin
  if v_uid is null then raise exception 'Connexion requise'; end if;

  select count(*), coalesce(max(score),0) into v_games, v_best
  from public.game_sessions where user_id = v_uid;

  select count(*) into v_cars from public.player_cars where user_id = v_uid;

  -- Nombre de parties qui ont etabli un nouveau record personnel (y compris la 1ere).
  select count(*) into v_records from (
    select score, max(score) over (order by created_at rows between unbounded preceding and 1 preceding) as prev_max
    from public.game_sessions where user_id = v_uid
  ) t where score > coalesce(prev_max, -1);

  select count(*) into v_daily from public.daily_challenge_claims where user_id = v_uid;

  return jsonb_build_object(
    'games_played', v_games, 'best_score', v_best,
    'cars_unlocked', v_cars + 1, -- +1 pour la citadine offerte, jamais dans player_cars
    'records_beaten', v_records,
    'daily_challenges_claimed', v_daily
  );
end;
$$;

grant execute on function public.my_stats() to authenticated;
