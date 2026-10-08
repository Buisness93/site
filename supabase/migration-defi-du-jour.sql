-- ============================================================
-- Defi du jour : objectif releve (300-500 -> 2500-4500 points) et
-- recompense 250 -> 400 credits. L'ancien objectif se faisait en ~8 s de
-- course. A executer une fois dans le SQL Editor de Supabase (la meme
-- fonction est aussi a jour dans schema.sql).
-- ============================================================
create or replace function public.claim_daily_challenge(p_score integer, p_car_id text, p_time numeric default null)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_days integer := floor(extract(epoch from now()) / 86400)::integer;
  v_ids text[] := array['citadine','audi-a3','golf-r','audi-a8','supra','m4-widebody','porsche-911','rs6-abt','huracan-performante','gt3-rs','812-competizione','aston-one77','aventador-svj','pagani-huayra-r','huayra-roadster','centenario','huayra-bc','daytona-sp3','apollo-ie','pagani-imola','mclaren-p1','laferrari','gma-t50','aston-valhalla','revuelto','chiron','veyron-ettore','w16-mistral','centodieci','bolide'];
  v_car_id text;
  v_target integer;
  v_reward integer := 400;
begin
  if v_uid is null then raise exception 'Connecte-toi pour reclamer le defi du jour.'; end if;
  v_car_id := v_ids[(v_days % array_length(v_ids,1)) + 1];
  v_target := 2500 + (v_days % 5) * 500;
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
