-- ============================================================
-- CASINO (credits virtuels du jeu uniquement : aucun argent reel, rien a retirer)
-- Crash, Dice, Plinko et Mines. Tous les tirages se font ICI, cote serveur :
-- le navigateur n'envoie que la mise et les reglages, jamais le resultat.
-- A executer une fois dans Supabase > SQL Editor (le fichier est rejouable).
-- ============================================================

create table if not exists public.casino_bets (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game text not null,
  bet integer not null,
  multiplier numeric not null default 0,
  payout integer not null default 0,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists casino_bets_user_idx on public.casino_bets (user_id, created_at desc);
create index if not exists casino_bets_recent_idx on public.casino_bets (created_at desc);
alter table public.casino_bets enable row level security;
-- Pas de policy : lecture uniquement via casino_history() / casino_feed().

create table if not exists public.casino_mines (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  bet integer not null,
  mines integer not null,
  grid integer[] not null,          -- positions des mines (0..24), jamais envoyees avant la fin
  revealed integer[] not null default '{}',
  state text not null default 'active', -- active | lost | cashed
  created_at timestamptz not null default now()
);
create index if not exists casino_mines_user_idx on public.casino_mines (user_id, state);
alter table public.casino_mines enable row level security;

-- Retire la mise du solde (verrouille la ligne pour eviter les doubles mises)
create or replace function public._casino_take(p_uid uuid, p_bet integer)
returns integer
language plpgsql security definer set search_path = public
as $$
declare v_money integer;
begin
  if p_uid is null then raise exception 'Connecte-toi pour jouer au casino.'; end if;
  if p_bet is null or p_bet < 10 then raise exception 'Mise minimum : 10 credits.'; end if;
  if p_bet > 10000000 then raise exception 'Mise maximum : 10 000 000 credits.'; end if;
  select money into v_money from public.profiles where id = p_uid for update;
  if v_money is null or v_money < p_bet then raise exception 'Credits insuffisants.'; end if;
  update public.profiles set money = money - p_bet where id = p_uid returning money into v_money;
  return v_money;
end;
$$;
revoke execute on function public._casino_take(uuid, integer) from public, anon, authenticated;

-- Gain d'un pari, plafonne a 1 milliard de credits (le solde est un entier 32 bits :
-- sans plafond, un gros multiplicateur sur une grosse mise depasserait sa capacite)
create or replace function public._casino_pay(p_amount numeric)
returns integer language sql immutable
as $$ select least(1000000000, greatest(0, floor(p_amount)))::integer $$;

-- Credite le gain, journalise le pari, renvoie le nouveau solde
create or replace function public._casino_settle(p_uid uuid, p_game text, p_bet integer, p_mult numeric, p_payout integer, p_details jsonb)
returns integer
language plpgsql security definer set search_path = public
as $$
declare v_money integer;
begin
  if p_payout > 0 then
    update public.profiles set money = least(2000000000::bigint, money::bigint + p_payout) where id = p_uid returning money into v_money;
  else
    select money into v_money from public.profiles where id = p_uid;
  end if;
  insert into public.casino_bets (user_id, game, bet, multiplier, payout, details)
    values (p_uid, p_game, p_bet, p_mult, p_payout, p_details);
  return v_money;
end;
$$;
revoke execute on function public._casino_settle(uuid, text, integer, numeric, integer, jsonb) from public, anon, authenticated;

-- ---------- DICE : nombre de 0.00 a 99.99, au-dessus / en dessous d'une cible ----------
create or replace function public.casino_dice(p_bet integer, p_target numeric, p_over boolean)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_roll numeric := floor(random() * 10000) / 100;
  v_chance numeric;
  v_mult numeric;
  v_win boolean;
  v_payout integer := 0;
  v_balance integer;
begin
  p_target := round(coalesce(p_target, 50), 2);
  v_chance := case when p_over then 100 - p_target else p_target end;
  if v_chance < 2 or v_chance > 95 then raise exception 'Chance de gain entre 2 %% et 95 %%.'; end if;
  perform public._casino_take(v_uid, p_bet);
  v_mult := round(99 / v_chance, 4);
  v_win := case when p_over then v_roll > p_target else v_roll < p_target end;
  if v_win then v_payout := public._casino_pay(p_bet * v_mult); end if;
  v_balance := public._casino_settle(v_uid, 'dice', p_bet, case when v_win then v_mult else 0 end, v_payout,
    jsonb_build_object('roll', v_roll, 'target', p_target, 'over', p_over));
  return jsonb_build_object('roll', v_roll, 'win', v_win, 'multiplier', v_mult, 'payout', v_payout, 'balance', v_balance);
end;
$$;
grant execute on function public.casino_dice(integer, numeric, boolean) to authenticated;

-- ---------- CRASH : le multiplicateur grimpe puis explose ; encaissement auto ----------
create or replace function public.casino_crash(p_bet integer, p_cashout numeric)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_r numeric := random();
  v_crash numeric;
  v_win boolean;
  v_payout integer := 0;
  v_balance integer;
begin
  p_cashout := round(coalesce(p_cashout, 2), 2);
  if p_cashout < 1.01 or p_cashout > 1000 then raise exception 'Encaissement entre x1.01 et x1000.'; end if;
  perform public._casino_take(v_uid, p_bet);
  v_crash := least(1000, greatest(1, floor(0.99 / (1 - v_r) * 100) / 100));
  v_win := p_cashout <= v_crash;
  if v_win then v_payout := public._casino_pay(p_bet * p_cashout); end if;
  v_balance := public._casino_settle(v_uid, 'crash', p_bet, case when v_win then p_cashout else 0 end, v_payout,
    jsonb_build_object('crash', v_crash, 'cashout', p_cashout));
  return jsonb_build_object('crash', v_crash, 'win', v_win, 'multiplier', p_cashout, 'payout', v_payout, 'balance', v_balance);
end;
$$;
grant execute on function public.casino_crash(integer, numeric) to authenticated;

-- ---------- PLINKO : 12 rangees de picots, 13 cases ----------
create or replace function public.casino_plinko(p_bet integer, p_risk text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_path integer[] := '{}';
  v_slot integer := 0;
  v_bit integer;
  v_table numeric[];
  v_mult numeric;
  v_payout integer;
  v_balance integer;
begin
  v_table := case coalesce(p_risk, 'medium')
    when 'low'  then array[10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10]
    when 'high' then array[170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170]
    else             array[33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33]
  end;
  perform public._casino_take(v_uid, p_bet);
  for i in 1..12 loop
    v_bit := case when random() < 0.5 then 0 else 1 end;
    v_path := v_path || v_bit;
    v_slot := v_slot + v_bit;
  end loop;
  v_mult := v_table[v_slot + 1];
  v_payout := public._casino_pay(p_bet * v_mult);
  v_balance := public._casino_settle(v_uid, 'plinko', p_bet, v_mult, v_payout,
    jsonb_build_object('risk', p_risk, 'slot', v_slot));
  return jsonb_build_object('path', v_path, 'slot', v_slot, 'multiplier', v_mult, 'payout', v_payout, 'balance', v_balance);
end;
$$;
grant execute on function public.casino_plinko(integer, text) to authenticated;

-- ---------- MINES : grille 5x5, on retourne des cases, on encaisse quand on veut ----------
create or replace function public._mines_mult(p_mines integer, p_k integer)
returns numeric
language plpgsql immutable
as $$
declare v numeric := 0.99;
begin
  for i in 0..p_k - 1 loop
    v := v * (25 - i)::numeric / (25 - p_mines - i);
  end loop;
  return round(v, 4);
end;
$$;

create or replace function public.casino_mines_start(p_bet integer, p_mines integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_grid integer[];
  v_id bigint;
  v_balance integer;
begin
  if p_mines is null or p_mines < 1 or p_mines > 24 then raise exception 'Entre 1 et 24 mines.'; end if;
  if exists (select 1 from public.casino_mines where user_id = v_uid and state = 'active') then
    raise exception 'Une partie de Mines est deja en cours.';
  end if;
  v_balance := public._casino_take(v_uid, p_bet);
  select array_agg(c) into v_grid from (select c from generate_series(0, 24) c order by random() limit p_mines) s;
  insert into public.casino_mines (user_id, bet, mines, grid) values (v_uid, p_bet, p_mines, v_grid) returning id into v_id;
  return jsonb_build_object('id', v_id, 'bet', p_bet, 'mines', p_mines, 'revealed', '[]'::jsonb,
    'next', public._mines_mult(p_mines, 1), 'balance', v_balance);
end;
$$;
grant execute on function public.casino_mines_start(integer, integer) to authenticated;

create or replace function public.casino_mines_cashout(p_id bigint)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r public.casino_mines;
  v_mult numeric;
  v_payout integer;
  v_balance integer;
begin
  select * into r from public.casino_mines where id = p_id and user_id = v_uid and state = 'active' for update;
  if r.id is null then raise exception 'Aucune partie en cours.'; end if;
  if coalesce(array_length(r.revealed, 1), 0) = 0 then raise exception 'Retourne au moins une case.'; end if;
  v_mult := public._mines_mult(r.mines, array_length(r.revealed, 1));
  v_payout := public._casino_pay(r.bet * v_mult);
  update public.casino_mines set state = 'cashed' where id = r.id;
  v_balance := public._casino_settle(v_uid, 'mines', r.bet, v_mult, v_payout,
    jsonb_build_object('mines', r.mines, 'gems', array_length(r.revealed, 1)));
  return jsonb_build_object('cashed', true, 'multiplier', v_mult, 'payout', v_payout, 'grid', to_jsonb(r.grid), 'balance', v_balance);
end;
$$;
grant execute on function public.casino_mines_cashout(bigint) to authenticated;

create or replace function public.casino_mines_reveal(p_id bigint, p_cell integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r public.casino_mines;
  v_k integer;
  v_balance integer;
begin
  select * into r from public.casino_mines where id = p_id and user_id = v_uid and state = 'active' for update;
  if r.id is null then raise exception 'Aucune partie en cours.'; end if;
  if p_cell is null or p_cell < 0 or p_cell > 24 then raise exception 'Case invalide.'; end if;
  if p_cell = any(r.revealed) then raise exception 'Case deja retournee.'; end if;

  if p_cell = any(r.grid) then
    update public.casino_mines set state = 'lost', revealed = revealed || p_cell where id = r.id;
    v_balance := public._casino_settle(v_uid, 'mines', r.bet, 0, 0,
      jsonb_build_object('mines', r.mines, 'gems', coalesce(array_length(r.revealed, 1), 0)));
    return jsonb_build_object('mine', true, 'grid', to_jsonb(r.grid), 'balance', v_balance);
  end if;

  update public.casino_mines set revealed = revealed || p_cell where id = r.id returning * into r;
  v_k := array_length(r.revealed, 1);
  -- toutes les gemmes trouvees : encaissement automatique
  if v_k = 25 - r.mines then
    return public.casino_mines_cashout(r.id) || jsonb_build_object('mine', false, 'cell', p_cell);
  end if;
  return jsonb_build_object('mine', false, 'cell', p_cell, 'revealed', to_jsonb(r.revealed),
    'multiplier', public._mines_mult(r.mines, v_k), 'next', public._mines_mult(r.mines, v_k + 1));
end;
$$;
grant execute on function public.casino_mines_reveal(bigint, integer) to authenticated;

-- Partie de Mines en cours (pour la reprendre apres un rechargement de page)
create or replace function public.casino_mines_state()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare r public.casino_mines;
begin
  select * into r from public.casino_mines where user_id = auth.uid() and state = 'active' order by id desc limit 1;
  if r.id is null then return null; end if;
  return jsonb_build_object('id', r.id, 'bet', r.bet, 'mines', r.mines, 'revealed', to_jsonb(r.revealed),
    'multiplier', case when coalesce(array_length(r.revealed, 1), 0) > 0 then public._mines_mult(r.mines, array_length(r.revealed, 1)) else 0 end,
    'next', public._mines_mult(r.mines, coalesce(array_length(r.revealed, 1), 0) + 1));
end;
$$;
grant execute on function public.casino_mines_state() to authenticated;

-- ---------- Historique perso + fil des derniers paris de tout le monde ----------
create or replace function public.casino_history()
returns table(game text, bet integer, multiplier numeric, payout integer, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select b.game, b.bet, b.multiplier, b.payout, b.created_at
  from public.casino_bets b where b.user_id = auth.uid()
  order by b.created_at desc limit 20;
$$;
grant execute on function public.casino_history() to authenticated;

create or replace function public.casino_feed()
returns table(username text, game text, bet integer, multiplier numeric, payout integer, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select coalesce(p.username, 'Pilote'), b.game, b.bet, b.multiplier, b.payout, b.created_at
  from public.casino_bets b left join public.profiles p on p.id = b.user_id
  order by b.created_at desc limit 20;
$$;
grant execute on function public.casino_feed() to anon, authenticated;


-- ============================================================
-- JEUX SUPPLEMENTAIRES : Limbo, Pile ou face, Roue, Roulette, Keno
-- ============================================================

-- ---------- LIMBO : un multiplicateur tombe, il faut qu'il atteigne la cible ----------
create or replace function public.casino_limbo(p_bet integer, p_target numeric)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result numeric := least(1000000, greatest(1, floor(0.99 / (1 - random()) * 100) / 100));
  v_win boolean;
  v_payout integer := 0;
  v_balance integer;
begin
  p_target := round(coalesce(p_target, 2), 2);
  if p_target < 1.01 or p_target > 1000000 then raise exception 'Cible entre x1.01 et x1 000 000.'; end if;
  perform public._casino_take(v_uid, p_bet);
  v_win := v_result >= p_target;
  if v_win then v_payout := public._casino_pay(p_bet * p_target); end if;
  v_balance := public._casino_settle(v_uid, 'limbo', p_bet, case when v_win then p_target else 0 end, v_payout,
    jsonb_build_object('result', v_result, 'target', p_target));
  return jsonb_build_object('result', v_result, 'win', v_win, 'multiplier', p_target, 'payout', v_payout, 'balance', v_balance);
end;
$$;
grant execute on function public.casino_limbo(integer, numeric) to authenticated;

-- ---------- PILE OU FACE : x1.98 ----------
create or replace function public.casino_coinflip(p_bet integer, p_side text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_side text := case when random() < 0.5 then 'pile' else 'face' end;
  v_win boolean;
  v_payout integer := 0;
  v_balance integer;
begin
  if p_side not in ('pile', 'face') then raise exception 'Choisis pile ou face.'; end if;
  perform public._casino_take(v_uid, p_bet);
  v_win := v_side = p_side;
  if v_win then v_payout := public._casino_pay(p_bet * 1.98); end if;
  v_balance := public._casino_settle(v_uid, 'coinflip', p_bet, case when v_win then 1.98 else 0 end, v_payout,
    jsonb_build_object('side', v_side, 'pick', p_side));
  return jsonb_build_object('side', v_side, 'win', v_win, 'multiplier', 1.98, 'payout', v_payout, 'balance', v_balance);
end;
$$;
grant execute on function public.casino_coinflip(integer, text) to authenticated;

-- ---------- ROUE : 20 segments, 3 niveaux de risque (retour ~99 %) ----------
create or replace function public.casino_wheel(p_bet integer, p_risk text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_seg integer := floor(random() * 20)::integer;
  v_table numeric[];
  v_mult numeric;
  v_payout integer;
  v_balance integer;
begin
  v_table := case coalesce(p_risk, 'medium')
    when 'low'  then array[1.5,1.2,1.2,0,1.2,1.2,1.2,0,1.2,1.2, 1.5,1.2,1.2,0,1.2,1.2,1.2,0,1.2,1.2]
    when 'high' then array[0,0,0,0,0,0,0,0,0,9.9, 0,0,0,0,0,0,0,0,0,9.9]
    else             array[0,1.9,0,1.5,0,2,0,1.5,0,3, 0,1.9,0,1.5,0,2,0,1.5,0,3]
  end;
  perform public._casino_take(v_uid, p_bet);
  v_mult := v_table[v_seg + 1];
  v_payout := public._casino_pay(p_bet * v_mult);
  v_balance := public._casino_settle(v_uid, 'wheel', p_bet, v_mult, v_payout,
    jsonb_build_object('risk', p_risk, 'segment', v_seg));
  return jsonb_build_object('segment', v_seg, 'multiplier', v_mult, 'payout', v_payout, 'balance', v_balance);
end;
$$;
grant execute on function public.casino_wheel(integer, text) to authenticated;

-- ---------- ROULETTE europeenne (0 a 36), plusieurs jetons par tour ----------
-- p_bets = [{"kind":"number","value":17,"amount":50}, {"kind":"red","amount":100}, ...]
-- kinds : number (x36), red/black/odd/even/low/high (x2), dozen/column value 1..3 (x3)
create or replace function public.casino_roulette(p_bets jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_n integer := floor(random() * 37)::integer;
  v_reds integer[] := array[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
  v_total integer := 0;
  v_payout integer := 0;
  v_b jsonb;
  v_kind text;
  v_val integer;
  v_amt integer;
  v_win boolean;
  v_mult numeric;
  v_balance integer;
begin
  if jsonb_typeof(p_bets) <> 'array' or jsonb_array_length(p_bets) = 0 or jsonb_array_length(p_bets) > 40 then
    raise exception 'Place entre 1 et 40 jetons.';
  end if;
  for v_b in select * from jsonb_array_elements(p_bets) loop
    v_amt := (v_b->>'amount')::integer;
    if v_amt is null or v_amt < 1 then raise exception 'Jeton invalide.'; end if;
    v_total := v_total + v_amt;
  end loop;
  perform public._casino_take(v_uid, v_total);

  for v_b in select * from jsonb_array_elements(p_bets) loop
    v_kind := v_b->>'kind'; v_val := (v_b->>'value')::integer; v_amt := (v_b->>'amount')::integer;
    v_win := case v_kind
      when 'number' then v_val = v_n
      when 'red'    then v_n = any(v_reds)
      when 'black'  then v_n > 0 and not (v_n = any(v_reds))
      when 'odd'    then v_n > 0 and v_n % 2 = 1
      when 'even'   then v_n > 0 and v_n % 2 = 0
      when 'low'    then v_n between 1 and 18
      when 'high'   then v_n between 19 and 36
      when 'dozen'  then v_n > 0 and (v_n - 1) / 12 + 1 = v_val
      when 'column' then v_n > 0 and (v_n - 1) % 3 + 1 = v_val
      else false
    end;
    v_mult := case when v_kind = 'number' then 36 when v_kind in ('dozen', 'column') then 3 else 2 end;
    if v_win then v_payout := public._casino_pay(v_payout::numeric + v_amt * v_mult); end if;
  end loop;

  v_balance := public._casino_settle(v_uid, 'roulette', v_total, round(v_payout::numeric / v_total, 4), v_payout,
    jsonb_build_object('number', v_n, 'bets', p_bets));
  return jsonb_build_object('number', v_n, 'red', v_n = any(v_reds), 'total', v_total, 'payout', v_payout, 'balance', v_balance);
end;
$$;
grant execute on function public.casino_roulette(jsonb) to authenticated;

-- ---------- KENO : choisis 1 a 10 numeros sur 40, 10 sont tires (retour ~97 %) ----------
create or replace function public._keno_table(p_n integer)
returns numeric[]
language sql immutable
as $$
  select case p_n
    when 1  then array[0, 3.9]
    when 2  then array[0, 1.6, 6.3]
    when 3  then array[0, 0, 4.8, 26]
    when 4  then array[0, 0, 2.1, 11, 36]
    when 5  then array[0, 0, 0, 7.1, 38, 120]
    when 6  then array[0, 0, 0, 3.3, 18, 57, 180]
    when 7  then array[0, 0, 0, 0, 12, 62, 200, 640]
    when 8  then array[0, 0, 0, 0, 5.8, 31, 98, 310, 1000]
    when 9  then array[0, 0, 0, 0, 0, 22, 115, 370, 1200, 3800]
    else         array[0, 0, 0, 0, 0, 11, 58, 180, 590, 1890, 6050]
  end::numeric[];
$$;

create or replace function public.casino_keno(p_bet integer, p_picks integer[])
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_n integer;
  v_draw integer[];
  v_hits integer;
  v_mult numeric;
  v_payout integer;
  v_balance integer;
begin
  select array_agg(distinct x) into p_picks from unnest(p_picks) x where x between 1 and 40;
  v_n := coalesce(array_length(p_picks, 1), 0);
  if v_n < 1 or v_n > 10 then raise exception 'Choisis entre 1 et 10 numeros.'; end if;
  perform public._casino_take(v_uid, p_bet);
  select array_agg(c) into v_draw from (select c from generate_series(1, 40) c order by random() limit 10) s;
  select count(*) into v_hits from unnest(p_picks) x where x = any(v_draw);
  v_mult := (public._keno_table(v_n))[v_hits + 1];
  v_payout := public._casino_pay(p_bet * v_mult);
  v_balance := public._casino_settle(v_uid, 'keno', p_bet, v_mult, v_payout,
    jsonb_build_object('picks', to_jsonb(p_picks), 'hits', v_hits));
  return jsonb_build_object('draw', to_jsonb(v_draw), 'hits', v_hits, 'multiplier', v_mult, 'payout', v_payout, 'balance', v_balance);
end;
$$;
grant execute on function public.casino_keno(integer, integer[]) to authenticated;


-- ============================================================
-- JEUX DE CARTES ET A ETAPES : Blackjack, Hi-Lo, Tower ; Slots ; Baccarat
-- ============================================================

-- Parties en cours (une par jeu et par joueur). `data` contient aussi les
-- elements secrets (carte cachee du croupier, bombes de la tour) : la table
-- n'est jamais lisible directement, seulement via les fonctions ci-dessous.
create table if not exists public.casino_rounds (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game text not null,
  bet integer not null,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
create index if not exists casino_rounds_user_idx on public.casino_rounds (user_id, game, status);
alter table public.casino_rounds enable row level security;

-- Carte au hasard (sabot "infini") : r = 1 (As) .. 13 (Roi), s = couleur 0..3
create or replace function public._card()
returns jsonb language sql volatile
as $$ select jsonb_build_object('r', 1 + floor(random() * 13)::integer, 's', floor(random() * 4)::integer) $$;

-- ---------- BLACKJACK : le croupier tire jusqu'a 17, blackjack paye 3:2 ----------
create or replace function public._bj_total(p jsonb)
returns integer
language plpgsql immutable
as $$
declare t integer := 0; aces integer := 0; c jsonb; v integer;
begin
  for c in select * from jsonb_array_elements(p) loop
    v := (c->>'r')::integer;
    if v = 1 then aces := aces + 1; t := t + 11;
    elsif v >= 10 then t := t + 10;
    else t := t + v; end if;
  end loop;
  while t > 21 and aces > 0 loop t := t - 10; aces := aces - 1; end loop;
  return t;
end;
$$;

-- Termine une main : le croupier joue (si besoin), on compare, on paie
create or replace function public._bj_finish(p_round public.casino_rounds, p_dealer_plays boolean)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  d jsonb := p_round.data;
  pl jsonb := d->'player';
  dl jsonb := d->'dealer';
  pt integer := public._bj_total(d->'player');
  dt integer;
  v_payout integer := 0;
  v_outcome text;
  v_balance integer;
begin
  if p_dealer_plays and pt <= 21 then
    while public._bj_total(dl) < 17 loop dl := dl || public._card(); end loop;
  end if;
  dt := public._bj_total(dl);
  if pt > 21 then v_outcome := 'bust';
  elsif dt > 21 or pt > dt then v_outcome := 'win'; v_payout := p_round.bet * 2;
  elsif pt = dt then v_outcome := 'push'; v_payout := p_round.bet;
  else v_outcome := 'lose'; end if;
  update public.casino_rounds set status = 'done', data = d || jsonb_build_object('dealer', dl) where id = p_round.id;
  v_balance := public._casino_settle(p_round.user_id, 'blackjack', p_round.bet, round(v_payout::numeric / p_round.bet, 4), v_payout,
    jsonb_build_object('player', pt, 'dealer', dt));
  return jsonb_build_object('id', p_round.id, 'done', true, 'outcome', v_outcome, 'player', pl, 'dealer', dl,
    'playerTotal', pt, 'dealerTotal', dt, 'bet', p_round.bet, 'payout', v_payout, 'balance', v_balance);
end;
$$;
revoke execute on function public._bj_finish(public.casino_rounds, boolean) from public, anon, authenticated;

create or replace function public.casino_bj_start(p_bet integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  pl jsonb := jsonb_build_array(public._card(), public._card());
  dl jsonb := jsonb_build_array(public._card(), public._card());
  r public.casino_rounds;
  v_balance integer;
  v_payout integer;
begin
  if exists (select 1 from public.casino_rounds where user_id = v_uid and game = 'blackjack' and status = 'active') then
    raise exception 'Une main de blackjack est deja en cours.';
  end if;
  v_balance := public._casino_take(v_uid, p_bet);
  insert into public.casino_rounds (user_id, game, bet, data) values (v_uid, 'blackjack', p_bet, jsonb_build_object('player', pl, 'dealer', dl))
    returning * into r;
  -- blackjacks d'entree
  if public._bj_total(pl) = 21 or public._bj_total(dl) = 21 then
    if public._bj_total(pl) = 21 and public._bj_total(dl) <> 21 then
      v_payout := public._casino_pay(p_bet * 2.5);
      update public.casino_rounds set status = 'done' where id = r.id;
      v_balance := public._casino_settle(v_uid, 'blackjack', p_bet, 2.5, v_payout, jsonb_build_object('blackjack', true));
      return jsonb_build_object('id', r.id, 'done', true, 'outcome', 'blackjack', 'player', pl, 'dealer', dl,
        'playerTotal', 21, 'dealerTotal', public._bj_total(dl), 'bet', p_bet, 'payout', v_payout, 'balance', v_balance);
    end if;
    return public._bj_finish(r, false);
  end if;
  return jsonb_build_object('id', r.id, 'done', false, 'player', pl, 'dealer', jsonb_build_array(dl->0),
    'playerTotal', public._bj_total(pl), 'bet', p_bet, 'canDouble', true, 'balance', v_balance);
end;
$$;
grant execute on function public.casino_bj_start(integer) to authenticated;

create or replace function public.casino_bj_action(p_id bigint, p_action text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r public.casino_rounds;
  pl jsonb;
  v_balance integer;
begin
  select * into r from public.casino_rounds where id = p_id and user_id = v_uid and game = 'blackjack' and status = 'active' for update;
  if r.id is null then raise exception 'Aucune main en cours.'; end if;
  pl := r.data->'player';
  if p_action = 'hit' then
    pl := pl || public._card();
    update public.casino_rounds set data = data || jsonb_build_object('player', pl) where id = r.id returning * into r;
    if public._bj_total(pl) >= 21 then return public._bj_finish(r, true); end if;
    select money into v_balance from public.profiles where id = v_uid;
    return jsonb_build_object('id', r.id, 'done', false, 'player', pl, 'dealer', jsonb_build_array(r.data->'dealer'->0),
      'playerTotal', public._bj_total(pl), 'bet', r.bet, 'canDouble', false, 'balance', v_balance);
  elsif p_action = 'stand' then
    return public._bj_finish(r, true);
  elsif p_action = 'double' then
    if jsonb_array_length(pl) <> 2 then raise exception 'On ne double que sur les 2 premieres cartes.'; end if;
    perform public._casino_take(v_uid, r.bet);
    pl := pl || public._card();
    update public.casino_rounds set bet = bet * 2, data = data || jsonb_build_object('player', pl, 'doubled', true) where id = r.id returning * into r;
    return public._bj_finish(r, true);
  end if;
  raise exception 'Action inconnue.';
end;
$$;
grant execute on function public.casino_bj_action(bigint, text) to authenticated;

-- ---------- HI-LO : plus haut ou plus bas que la carte, on encaisse quand on veut ----------
create or replace function public.casino_hilo_start(p_bet integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  c jsonb := public._card();
  r public.casino_rounds;
  v_balance integer;
begin
  if exists (select 1 from public.casino_rounds where user_id = v_uid and game = 'hilo' and status = 'active') then
    raise exception 'Une partie de Hi-Lo est deja en cours.';
  end if;
  v_balance := public._casino_take(v_uid, p_bet);
  insert into public.casino_rounds (user_id, game, bet, data)
    values (v_uid, 'hilo', p_bet, jsonb_build_object('card', c, 'mult', 1, 'wins', 0, 'history', jsonb_build_array(c)))
    returning * into r;
  return jsonb_build_object('id', r.id, 'card', c, 'mult', 1, 'wins', 0, 'history', jsonb_build_array(c), 'bet', p_bet, 'balance', v_balance);
end;
$$;
grant execute on function public.casino_hilo_start(integer) to authenticated;

create or replace function public.casino_hilo_cashout(p_id bigint)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r public.casino_rounds;
  v_mult numeric;
  v_payout integer;
  v_balance integer;
begin
  select * into r from public.casino_rounds where id = p_id and user_id = v_uid and game = 'hilo' and status = 'active' for update;
  if r.id is null then raise exception 'Aucune partie en cours.'; end if;
  if (r.data->>'wins')::integer < 1 then raise exception 'Gagne au moins un tour avant d''encaisser.'; end if;
  v_mult := (r.data->>'mult')::numeric;
  v_payout := public._casino_pay(r.bet * v_mult);
  update public.casino_rounds set status = 'done' where id = r.id;
  v_balance := public._casino_settle(v_uid, 'hilo', r.bet, v_mult, v_payout, jsonb_build_object('wins', r.data->'wins'));
  return jsonb_build_object('done', true, 'cashed', true, 'mult', v_mult, 'payout', v_payout, 'balance', v_balance);
end;
$$;
grant execute on function public.casino_hilo_cashout(bigint) to authenticated;

create or replace function public.casino_hilo_guess(p_id bigint, p_dir text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r public.casino_rounds;
  cur integer;
  nx jsonb := public._card();
  n integer;
  p numeric;
  v_win boolean;
  v_mult numeric;
  v_hist jsonb;
  v_balance integer;
begin
  select * into r from public.casino_rounds where id = p_id and user_id = v_uid and game = 'hilo' and status = 'active' for update;
  if r.id is null then raise exception 'Aucune partie en cours.'; end if;
  cur := (r.data->'card'->>'r')::integer;
  n := (nx->>'r')::integer;
  v_hist := (r.data->'history') || nx;
  v_mult := (r.data->>'mult')::numeric;
  if p_dir = 'skip' then
    update public.casino_rounds set data = data || jsonb_build_object('card', nx, 'history', v_hist) where id = r.id;
    return jsonb_build_object('id', r.id, 'card', nx, 'mult', v_mult, 'wins', r.data->'wins', 'history', v_hist, 'skipped', true);
  end if;
  -- "plus haut ou egal" / "plus bas ou egal"
  if p_dir = 'hi' then p := (14 - cur)::numeric / 13; v_win := n >= cur;
  elsif p_dir = 'lo' then p := cur::numeric / 13; v_win := n <= cur;
  else raise exception 'Choix invalide.'; end if;
  if p >= 1 then raise exception 'Ce choix gagne a coup sur : choisis l''autre ou passe la carte.'; end if;
  if not v_win then
    update public.casino_rounds set status = 'done', data = data || jsonb_build_object('card', nx, 'history', v_hist) where id = r.id;
    v_balance := public._casino_settle(v_uid, 'hilo', r.bet, 0, 0, jsonb_build_object('wins', r.data->'wins'));
    return jsonb_build_object('done', true, 'lost', true, 'card', nx, 'history', v_hist, 'balance', v_balance);
  end if;
  v_mult := round(v_mult * 0.99 / p, 4);
  update public.casino_rounds set data = data || jsonb_build_object('card', nx, 'history', v_hist, 'mult', v_mult, 'wins', (r.data->>'wins')::integer + 1)
    where id = r.id;
  return jsonb_build_object('id', r.id, 'card', nx, 'mult', v_mult, 'wins', (r.data->>'wins')::integer + 1, 'history', v_hist);
end;
$$;
grant execute on function public.casino_hilo_guess(bigint, text) to authenticated;

-- ---------- TOWER : 8 etages, une case par etage, evite les pieges ----------
create or replace function public._tower_cfg(p_diff text)
returns integer[] language sql immutable
as $$ select case p_diff when 'easy' then array[4,1] when 'hard' then array[2,1] when 'expert' then array[3,2] else array[3,1] end $$;

create or replace function public._tower_mult(p_diff text, p_k integer)
returns numeric language sql immutable
as $$
  select round(0.99 * power((public._tower_cfg(p_diff))[1]::numeric / ((public._tower_cfg(p_diff))[1] - (public._tower_cfg(p_diff))[2]), p_k), 4)
$$;

create or replace function public.casino_tower_start(p_bet integer, p_diff text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  cfg integer[] := public._tower_cfg(p_diff);
  v_board jsonb := '[]'::jsonb;
  v_row jsonb;
  r public.casino_rounds;
  v_balance integer;
begin
  if p_diff not in ('easy', 'medium', 'hard', 'expert') then raise exception 'Difficulte inconnue.'; end if;
  if exists (select 1 from public.casino_rounds where user_id = v_uid and game = 'tower' and status = 'active') then
    raise exception 'Une tour est deja en cours.';
  end if;
  v_balance := public._casino_take(v_uid, p_bet);
  for i in 1..8 loop
    select jsonb_agg(c) into v_row from (select c from generate_series(0, cfg[1] - 1) c order by random() limit cfg[2]) s;
    v_board := v_board || jsonb_build_array(v_row);
  end loop;
  insert into public.casino_rounds (user_id, game, bet, data)
    values (v_uid, 'tower', p_bet, jsonb_build_object('diff', p_diff, 'board', v_board, 'picks', '[]'::jsonb))
    returning * into r;
  return jsonb_build_object('id', r.id, 'diff', p_diff, 'cols', cfg[1], 'picks', '[]'::jsonb, 'mult', 0,
    'next', public._tower_mult(p_diff, 1), 'bet', p_bet, 'balance', v_balance);
end;
$$;
grant execute on function public.casino_tower_start(integer, text) to authenticated;

create or replace function public.casino_tower_cashout(p_id bigint)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r public.casino_rounds;
  k integer;
  v_mult numeric;
  v_payout integer;
  v_balance integer;
begin
  select * into r from public.casino_rounds where id = p_id and user_id = v_uid and game = 'tower' and status = 'active' for update;
  if r.id is null then raise exception 'Aucune tour en cours.'; end if;
  k := jsonb_array_length(r.data->'picks');
  if k < 1 then raise exception 'Monte au moins un etage.'; end if;
  v_mult := public._tower_mult(r.data->>'diff', k);
  v_payout := public._casino_pay(r.bet * v_mult);
  update public.casino_rounds set status = 'done' where id = r.id;
  v_balance := public._casino_settle(v_uid, 'tower', r.bet, v_mult, v_payout, jsonb_build_object('diff', r.data->'diff', 'floors', k));
  return jsonb_build_object('done', true, 'cashed', true, 'mult', v_mult, 'payout', v_payout, 'board', r.data->'board', 'balance', v_balance);
end;
$$;
grant execute on function public.casino_tower_cashout(bigint) to authenticated;

create or replace function public.casino_tower_pick(p_id bigint, p_col integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r public.casino_rounds;
  k integer;
  cfg integer[];
  v_picks jsonb;
  v_balance integer;
begin
  select * into r from public.casino_rounds where id = p_id and user_id = v_uid and game = 'tower' and status = 'active' for update;
  if r.id is null then raise exception 'Aucune tour en cours.'; end if;
  cfg := public._tower_cfg(r.data->>'diff');
  if p_col is null or p_col < 0 or p_col >= cfg[1] then raise exception 'Case invalide.'; end if;
  k := jsonb_array_length(r.data->'picks');
  v_picks := (r.data->'picks') || to_jsonb(p_col);
  if (r.data->'board'->k) @> to_jsonb(p_col) then
    update public.casino_rounds set status = 'done', data = data || jsonb_build_object('picks', v_picks) where id = r.id;
    v_balance := public._casino_settle(v_uid, 'tower', r.bet, 0, 0, jsonb_build_object('diff', r.data->'diff', 'floors', k));
    return jsonb_build_object('done', true, 'lost', true, 'picks', v_picks, 'board', r.data->'board', 'balance', v_balance);
  end if;
  update public.casino_rounds set data = data || jsonb_build_object('picks', v_picks) where id = r.id returning * into r;
  if k + 1 = 8 then
    return public.casino_tower_cashout(r.id) || jsonb_build_object('picks', v_picks);
  end if;
  return jsonb_build_object('id', r.id, 'picks', v_picks, 'mult', public._tower_mult(r.data->>'diff', k + 1),
    'next', public._tower_mult(r.data->>'diff', k + 2));
end;
$$;
grant execute on function public.casino_tower_pick(bigint, integer) to authenticated;

-- Parties a etapes en cours (blackjack, hi-lo, tower), sans les elements secrets
create or replace function public.casino_round_state(p_game text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare r public.casino_rounds; k integer;
begin
  select * into r from public.casino_rounds where user_id = auth.uid() and game = p_game and status = 'active' order by id desc limit 1;
  if r.id is null then return null; end if;
  if p_game = 'blackjack' then
    return jsonb_build_object('id', r.id, 'done', false, 'player', r.data->'player', 'dealer', jsonb_build_array(r.data->'dealer'->0),
      'playerTotal', public._bj_total(r.data->'player'), 'bet', r.bet, 'canDouble', jsonb_array_length(r.data->'player') = 2);
  elsif p_game = 'hilo' then
    return jsonb_build_object('id', r.id, 'card', r.data->'card', 'mult', r.data->'mult', 'wins', r.data->'wins', 'history', r.data->'history', 'bet', r.bet);
  elsif p_game = 'tower' then
    k := jsonb_array_length(r.data->'picks');
    return jsonb_build_object('id', r.id, 'diff', r.data->'diff', 'cols', (public._tower_cfg(r.data->>'diff'))[1], 'picks', r.data->'picks',
      'mult', case when k > 0 then public._tower_mult(r.data->>'diff', k) else 0 end, 'next', public._tower_mult(r.data->>'diff', k + 1), 'bet', r.bet);
  end if;
  return null;
end;
$$;
grant execute on function public.casino_round_state(text) to authenticated;

-- ---------- SLOTS : 3 rouleaux, ligne du milieu (retour ~96,5 %) ----------
create or replace function public._slot_symbol()
returns text language plpgsql volatile
as $$
declare x numeric := random() * 100;
begin
  -- poids : cerise 30, citron 25, cloche 18, etoile 12, diamant 7, sept 5, voiture 3
  if x < 30 then return 'cherry'; elsif x < 55 then return 'lemon'; elsif x < 73 then return 'bell';
  elsif x < 85 then return 'star'; elsif x < 92 then return 'diamond'; elsif x < 97 then return 'seven'; end if;
  return 'car';
end;
$$;

create or replace function public.casino_slots(p_bet integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  a text := public._slot_symbol(); b text := public._slot_symbol(); c text := public._slot_symbol();
  v_mult numeric := 0;
  v_cherries integer;
  v_payout integer;
  v_balance integer;
begin
  perform public._casino_take(v_uid, p_bet);
  if a = b and b = c then
    v_mult := case a when 'cherry' then 5 when 'lemon' then 8 when 'bell' then 15 when 'star' then 30
      when 'diamond' then 80 when 'seven' then 200 else 800 end;
  else
    v_cherries := (a = 'cherry')::integer + (b = 'cherry')::integer + (c = 'cherry')::integer;
    if v_cherries = 2 then v_mult := 2.6; end if;
  end if;
  v_payout := public._casino_pay(p_bet * v_mult);
  v_balance := public._casino_settle(v_uid, 'slots', p_bet, v_mult, v_payout, jsonb_build_object('reels', jsonb_build_array(a, b, c)));
  return jsonb_build_object('reels', jsonb_build_array(a, b, c), 'multiplier', v_mult, 'payout', v_payout, 'balance', v_balance);
end;
$$;
grant execute on function public.casino_slots(integer) to authenticated;

-- ---------- BACCARAT : joueur x2, banquier x1.95, egalite x9 (regles de tirage officielles) ----------
create or replace function public._bac_val(c jsonb)
returns integer language sql immutable
as $$ select case when (c->>'r')::integer >= 10 then 0 else (c->>'r')::integer end $$;

create or replace function public.casino_baccarat(p_player integer, p_banker integer, p_tie integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  pc jsonb := jsonb_build_array(public._card(), public._card());
  bc jsonb := jsonb_build_array(public._card(), public._card());
  pt integer; bt integer; p3 jsonb := null; v integer;
  v_total integer;
  v_payout integer := 0;
  v_winner text;
  v_balance integer;
begin
  p_player := greatest(0, coalesce(p_player, 0)); p_banker := greatest(0, coalesce(p_banker, 0)); p_tie := greatest(0, coalesce(p_tie, 0));
  v_total := p_player + p_banker + p_tie;
  perform public._casino_take(v_uid, v_total);
  pt := (public._bac_val(pc->0) + public._bac_val(pc->1)) % 10;
  bt := (public._bac_val(bc->0) + public._bac_val(bc->1)) % 10;
  if pt < 8 and bt < 8 then
    if pt <= 5 then
      p3 := public._card(); pc := pc || p3; pt := (pt + public._bac_val(p3)) % 10;
    end if;
    if p3 is null then
      if bt <= 5 then bc := bc || public._card(); end if;
    else
      v := public._bac_val(p3);
      if bt <= 2 or (bt = 3 and v <> 8) or (bt = 4 and v between 2 and 7) or (bt = 5 and v between 4 and 7) or (bt = 6 and v between 6 and 7) then
        bc := bc || public._card();
      end if;
    end if;
    bt := 0;
    for i in 0..jsonb_array_length(bc) - 1 loop bt := bt + public._bac_val(bc->i); end loop;
    bt := bt % 10;
  end if;
  if pt > bt then v_winner := 'player'; v_payout := p_player * 2;
  elsif bt > pt then v_winner := 'banker'; v_payout := public._casino_pay(p_banker * 1.95);
  else v_winner := 'tie'; v_payout := p_tie * 9 + p_player + p_banker;
  end if;
  v_balance := public._casino_settle(v_uid, 'baccarat', v_total, round(v_payout::numeric / v_total, 4), v_payout,
    jsonb_build_object('winner', v_winner, 'player', pt, 'banker', bt));
  return jsonb_build_object('player', pc, 'banker', bc, 'playerTotal', pt, 'bankerTotal', bt, 'winner', v_winner,
    'total', v_total, 'payout', v_payout, 'balance', v_balance);
end;
$$;
grant execute on function public.casino_baccarat(integer, integer, integer) to authenticated;
