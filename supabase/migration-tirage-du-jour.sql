-- ============================================================
-- 9bis. TIRAGE QUOTIDIEN (caisse gratuite, 1x/jour)
-- Lots par rarete : Commun 200 (50%), Rare 400 (30%), Epique 900 (13%),
-- Legendaire 2000 (5%), Jackpot = une voiture rare non possedee (2%).
-- Serie : chaque jour consecutif ajoute +10% aux credits (max +50% des le 6e
-- jour), et chaque 7e jour de serie garantit au moins un lot Epique.
-- Tout est tire ici, cote serveur : le client ne fait que mettre en scene.
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

-- Nombre de jours consecutifs avec un tirage, en remontant depuis `p_from`.
create or replace function public._draw_streak(p_uid uuid, p_from integer)
returns integer
language plpgsql stable security definer set search_path = public
as $$
declare
  v_n integer := 0;
begin
  while v_n < 60 and exists (select 1 from public.daily_draw_claims where user_id = p_uid and draw_day = p_from - v_n) loop
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
revoke execute on function public._draw_streak(uuid, integer) from public, anon, authenticated;

create or replace function public.claim_daily_draw()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_days integer := floor(extract(epoch from now()) / 86400)::integer;
  v_roll numeric := random();
  v_day_n integer;      -- jour de la serie (1 = premier jour)
  v_mult numeric;
  v_weekly boolean;
  v_rarity text;
  v_base integer := 0;
  v_credits integer := 0;
  v_car_id text;
  -- Lot "voiture rare" : sportives/hypercars de 26k a 95k credits.
  v_jackpot_ids text[] := array['rs6-abt','porsche-911','huracan-performante','gt3-rs','aston-one77',
                                'huayra-roadster','812-competizione','pagani-huayra-r','aventador-svj','veyron-ettore'];
begin
  if v_uid is null then raise exception 'Connecte-toi pour tenter le tirage du jour.'; end if;
  if exists (select 1 from public.daily_draw_claims where user_id = v_uid and draw_day = v_days) then
    raise exception 'Tirage du jour deja tente.';
  end if;

  v_day_n := public._draw_streak(v_uid, v_days - 1) + 1;
  v_mult := 1 + least(v_day_n - 1, 5) * 0.1;
  v_weekly := v_day_n % 7 = 0;
  -- 7e jour : le tirage se fait uniquement dans les 20% du haut (Epique ou mieux)
  if v_weekly then v_roll := v_roll * 0.20; end if;

  if v_roll < 0.02 then
    v_rarity := 'jackpot';
    select id into v_car_id from unnest(v_jackpot_ids) as id
      where id not in (select car_id from public.player_cars where user_id = v_uid)
      order by random() limit 1;
    if v_car_id is null then v_base := 8000; end if; -- tout deja debloque : gros bonus a la place
  elsif v_roll < 0.07 then v_rarity := 'legendaire'; v_base := 2000;
  elsif v_roll < 0.20 then v_rarity := 'epique';     v_base := 900;
  elsif v_roll < 0.50 then v_rarity := 'rare';       v_base := 400;
  else                     v_rarity := 'commun';     v_base := 200;
  end if;

  v_credits := round(v_base * v_mult)::integer;
  if v_car_id is not null then
    insert into public.player_cars (user_id, car_id) values (v_uid, v_car_id) on conflict do nothing;
  end if;

  insert into public.daily_draw_claims (user_id, draw_day, reward_credits, reward_car_id)
    values (v_uid, v_days, v_credits, v_car_id);
  if v_credits > 0 then
    update public.profiles set money = money + v_credits where id = v_uid;
  end if;

  return jsonb_build_object('credits', v_credits, 'car_id', v_car_id, 'rarity', v_rarity,
    'base', v_base, 'mult', v_mult, 'streak', v_day_n, 'weekly', v_weekly);
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

-- Etat du tirage pour l'affichage de la carte : deja tire aujourd'hui, jour de
-- serie (celui en cours si deja tire, sinon celui qu'on atteindrait en tirant),
-- bonus associe et lot du jour s'il existe.
create or replace function public.daily_draw_status()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_days integer := floor(extract(epoch from now()) / 86400)::integer;
  v_row public.daily_draw_claims%rowtype;
  v_day_n integer;
  v_claimed boolean;
begin
  if v_uid is null then return null; end if;
  select * into v_row from public.daily_draw_claims where user_id = v_uid and draw_day = v_days;
  v_claimed := found;
  if v_claimed then v_day_n := public._draw_streak(v_uid, v_days);
  else v_day_n := public._draw_streak(v_uid, v_days - 1) + 1;
  end if;
  return jsonb_build_object('claimed', v_claimed, 'streak', v_day_n,
    'mult', 1 + least(v_day_n - 1, 5) * 0.1, 'weekly', v_day_n % 7 = 0,
    'credits', v_row.reward_credits, 'car_id', v_row.reward_car_id);
end;
$$;

grant execute on function public.daily_draw_status() to authenticated;
