alter table game.players
  add column if not exists normalized_name varchar(40),
  add column if not exists password_hash text,
  add column if not exists auth_provider varchar(16) not null default 'guest',
  add column if not exists discord_user_id varchar(32),
  add column if not exists last_login_at timestamptz;

with ranked_names as (
  select
    id,
    lower(btrim(display_name)) as base_name,
    row_number() over (partition by lower(btrim(display_name)) order by created_at, id) as duplicate_number
  from game.players
  where normalized_name is null
)
update game.players players
set normalized_name = case
  when ranked_names.duplicate_number = 1 then ranked_names.base_name
  else left(ranked_names.base_name, 30) || '-' || left(players.id::text, 8)
end
from ranked_names
where players.id = ranked_names.id;

alter table game.players
  alter column normalized_name set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'players_normalized_name_unique'
      and conrelid = 'game.players'::regclass
  ) then
    alter table game.players
      add constraint players_normalized_name_unique unique (normalized_name);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'players_discord_user_id_unique'
      and conrelid = 'game.players'::regclass
  ) then
    alter table game.players
      add constraint players_discord_user_id_unique unique (discord_user_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'players_auth_provider_allowed'
      and conrelid = 'game.players'::regclass
  ) then
    alter table game.players
      add constraint players_auth_provider_allowed
      check (auth_provider in ('guest', 'password', 'discord'));
  end if;
end
$$;

create table if not exists game.auth_sessions (
  token_hash bytea primary key check (octet_length(token_hash) = 32),
  player_id uuid not null references game.players(id) on delete cascade,
  csrf_hash bytea not null check (octet_length(csrf_hash) = 32),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists auth_sessions_player_idx
  on game.auth_sessions(player_id);
create index if not exists auth_sessions_expiry_idx
  on game.auth_sessions(expires_at);

create table if not exists game.player_decks (
  player_id uuid primary key references game.players(id) on delete cascade,
  card_ids text[] not null check (cardinality(card_ids) = 12),
  updated_at timestamptz not null default now()
);

create table if not exists game.socket_tickets (
  token_hash bytea primary key check (octet_length(token_hash) = 32),
  player_id uuid not null references game.players(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists socket_tickets_expiry_idx
  on game.socket_tickets(expires_at);

create table if not exists game.oauth_states (
  state_hash bytea primary key check (octet_length(state_hash) = 32),
  code_verifier varchar(128) not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists oauth_states_expiry_idx
  on game.oauth_states(expires_at);

create table if not exists game.auth_rate_limits (
  key_hash bytea primary key check (octet_length(key_hash) = 32),
  attempts integer not null default 1 check (attempts > 0),
  window_started_at timestamptz not null default now()
);

grant select, insert, update, delete on
  game.auth_sessions,
  game.player_decks,
  game.socket_tickets,
  game.oauth_states,
  game.auth_rate_limits
to tronos_app;

revoke all on game.schema_migrations from tronos_app;
