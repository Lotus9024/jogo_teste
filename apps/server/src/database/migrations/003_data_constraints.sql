alter table game.players
  add constraint players_display_name_length
  check (char_length(btrim(display_name)) between 2 and 32);

alter table game.matches
  add constraint matches_status_allowed
  check (status in ('waiting', 'playing', 'finished', 'abandoned'));

alter table game.game_events
  add constraint game_events_type_length
  check (char_length(event_type) between 1 and 50);

revoke all on game.schema_migrations from tronos_app;
