create extension if not exists pgcrypto;

create table players (
  id uuid primary key default gen_random_uuid(),
  display_name varchar(32) not null,
  created_at timestamptz not null default now()
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  room_code varchar(8) not null unique,
  status varchar(20) not null default 'waiting',
  winner_player_id uuid references players(id),
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table match_players (
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  seat smallint not null check (seat between 1 and 2),
  joined_at timestamptz not null default now(),
  primary key (match_id, player_id),
  unique (match_id, seat)
);

create table game_events (
  id bigint generated always as identity primary key,
  match_id uuid not null references matches(id) on delete cascade,
  sequence integer not null,
  player_id uuid references players(id),
  event_type varchar(50) not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (match_id, sequence)
);

create index game_events_match_sequence_idx on game_events(match_id, sequence);
