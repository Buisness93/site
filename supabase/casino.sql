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
  if p_bet > 100000 then raise exception 'Mise maximum : 100 000 credits.'; end if;
  select money into v_money from public.profiles where id = p_uid for update;
  if v_money is null or v_money < p_bet then raise exception 'Credits insuffisants.'; end if;
  update public.profiles set money = money - p_bet where id = p_uid returning money into v_money;
  return v_money;
end;
$$;
revoke execute on function public._casino_take(uuid, integer) from public, anon, authenticated;

-- Credite le gain, journalise le pari, renvoie le nouveau solde
create or replace function public._casino_settle(p_uid uuid, p_game text, p_bet integer, p_mult numeric, p_payout integer, p_details jsonb)
returns integer
language plpgsql security definer set search_path = public
as $$
declare v_money integer;
begin
  if p_payout > 0 then
    update public.profiles set money = money + p_payout where id = p_uid returning money into v_money;
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
  if v_win then v_payout := floor(p_bet * v_mult); end if;
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
  if v_win then v_payout := floor(p_bet * p_cashout); end if;
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
  v_payout := floor(p_bet * v_mult);
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
  v_payout := floor(r.bet * v_mult);
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
  if v_win then v_payout := floor(p_bet * p_target); end if;
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
  if v_win then v_payout := floor(p_bet * 1.98); end if;
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
  v_payout := floor(p_bet * v_mult);
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
    if v_win then v_payout := v_payout + floor(v_amt * v_mult); end if;
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
  v_payout := floor(p_bet * v_mult);
  v_balance := public._casino_settle(v_uid, 'keno', p_bet, v_mult, v_payout,
    jsonb_build_object('picks', to_jsonb(p_picks), 'hits', v_hits));
  return jsonb_build_object('draw', to_jsonb(v_draw), 'hits', v_hits, 'multiplier', v_mult, 'payout', v_payout, 'balance', v_balance);
end;
$$;
grant execute on function public.casino_keno(integer, integer[]) to authenticated;
