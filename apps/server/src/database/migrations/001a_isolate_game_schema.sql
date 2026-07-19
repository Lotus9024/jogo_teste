create schema if not exists game authorization tronos_owner;

do $$
begin
  if to_regclass('public.players') is not null and to_regclass('game.players') is null then
    alter table public.players set schema game;
  end if;
  if to_regclass('public.matches') is not null and to_regclass('game.matches') is null then
    alter table public.matches set schema game;
  end if;
  if to_regclass('public.match_players') is not null and to_regclass('game.match_players') is null then
    alter table public.match_players set schema game;
  end if;
  if to_regclass('public.game_events') is not null and to_regclass('game.game_events') is null then
    alter table public.game_events set schema game;
  end if;
end
$$;
