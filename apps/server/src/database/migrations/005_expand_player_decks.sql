alter table game.player_decks
  drop constraint if exists player_decks_card_ids_check;

update game.player_decks
set
  card_ids = card_ids
    || array[(
      select candidate
      from unnest(array[
        'warrior',
        'guard',
        'wooden_barrier',
        'operator',
        'citizen',
        'wooden_house',
        'road',
        'goblin'
      ]::text[]) as candidate
      where not candidate = any(card_ids)
      limit 1
    )]
    || array[(
      select candidate
      from unnest(array[
        'henry',
        'archer',
        'tower',
        'cannon',
        'goblin_house',
        'goblin_swarm',
        'goblin_bomber',
        'goblin_clone',
        'goblin_spanking',
        'builder_area',
        'cobblestone_road',
        'blizzard'
      ]::text[]) as candidate
      where not candidate = any(card_ids)
      limit 1
    )]
    || array[(
      select candidate
      from unnest(array[
        'mage',
        'goblin_tower',
        'royal_warrior',
        'royal_tower'
      ]::text[]) as candidate
      where not candidate = any(card_ids)
      limit 1
    )],
  updated_at = now()
where cardinality(card_ids) = 12;

alter table game.player_decks
  add constraint player_decks_card_ids_check
  check (cardinality(card_ids) = 15);
