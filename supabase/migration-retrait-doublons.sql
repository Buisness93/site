-- Retrait des voitures trop proches d'une autre de la meme marque :
--   911 Turbo S (porsche-911), Huayra Roadster (huayra-roadster),
--   Centenario Roadster (centenario), W16 Mistral (w16-mistral).
-- A executer une fois dans Supabase > SQL Editor, puis re-executer
-- migration-defi-du-jour.sql et migration-tirage-du-jour.sql (listes mises a jour).
--
-- Chaque joueur qui possedait une de ces voitures est rembourse de son prix
-- catalogue, puis la voiture est retiree de son garage. Les lignes restent dans
-- cars_catalog (references par les codes promo / historiques). Relancer le script
-- ne rembourse pas deux fois : les voitures sont supprimees dans la meme requete.

with removed as (
  delete from public.player_cars pc
  using public.cars_catalog cc
  where pc.car_id = cc.id
    and pc.car_id in ('porsche-911','huayra-roadster','centenario','w16-mistral')
  returning pc.user_id, cc.price
), refunds as (
  select user_id, sum(price)::integer as total
  from removed
  group by user_id
)
update public.profiles p
set money = p.money + r.total
from refunds r
where p.id = r.user_id;
