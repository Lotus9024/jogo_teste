revoke all on schema public from public;
revoke create on schema public from public;

grant usage on schema game to tronos_app;
grant select, insert, update, delete on all tables in schema game to tronos_app;
grant usage, select on all sequences in schema game to tronos_app;

alter default privileges for role tronos_owner in schema game
  grant select, insert, update, delete on tables to tronos_app;
alter default privileges for role tronos_owner in schema game
  grant usage, select on sequences to tronos_app;

revoke all on game.schema_migrations from tronos_app;
