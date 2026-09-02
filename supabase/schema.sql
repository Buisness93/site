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
  ('berline-sport', 5000),
  ('suv', 6500),
  ('golf-r', 9500),
  ('suv-luxe', 12000),
  ('audi-a8', 16000),
  ('gt3', 25000),
  ('rs6-abt', 32000),
  ('aventador', 60000),
  ('812-competizione', 75000),
  ('pagani-huayra-r', 110000),
  ('centodieci', 150000),
  ('mclaren-p1', 180000),
  ('laferrari', 220000)
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

alter table public.game_sessions enable row level security;
-- Pas de select public : les stats agregees passent par admin_stats().

-- ============================================================
-- 5. FONCTIONS DE JEU (SECURITY DEFINER : seules portes de mutation)
-- ============================================================

-- Soumet un score de fin de partie, alimente le classement + les stats,
-- et credite l'argent gagne si le joueur est connecte.
create or replace function public.submit_run(
  p_name text, p_score integer, p_car text, p_time numeric, p_route text
) returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_credits integer;
begin
  if p_score is null or p_score < 0 then p_score := 0; end if;
  v_credits := greatest(5, floor(p_score / 10.0)::integer);

  insert into public.leaderboard (user_id, name, score, car, time_seconds, route_id)
  values (v_uid, left(coalesce(p_name,'Pilote'), 20), p_score, p_car, p_time, p_route);

  insert into public.game_sessions (user_id, score, time_seconds, car_id, route_id, credits_earned)
  values (v_uid, p_score, p_time, p_car, p_route, v_credits);

  if v_uid is not null then
    update public.profiles set money = money + v_credits where id = v_uid;
  end if;

  return v_credits;
end;
$$;

grant execute on function public.submit_run(text, integer, text, numeric, text) to anon, authenticated;

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
