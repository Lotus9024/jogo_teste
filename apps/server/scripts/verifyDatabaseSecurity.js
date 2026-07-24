import pg from 'pg';
import { config } from '../src/config.js';
import { createDatabaseConnectionOptions } from '../src/database/tls.js';

if (!config.databaseUrl) throw new Error('DATABASE_URL não configurada.');
const client = new pg.Client({
  ...createDatabaseConnectionOptions(config.databaseUrl, config),
  application_name: 'nexus-security-check'
});
await client.connect();

const privileges = await client.query(`
  select
    current_user = 'tronos_app' as correct_role,
    has_database_privilege(current_user, current_database(), 'CONNECT') as can_connect,
    not has_database_privilege(current_user, current_database(), 'CREATE') as cannot_create_database_objects,
    not has_database_privilege(current_user, current_database(), 'TEMP') as cannot_create_temp_tables,
    has_schema_privilege(current_user, 'game', 'USAGE') as can_use_game_schema,
    not has_schema_privilege(current_user, 'game', 'CREATE') as cannot_create_in_game_schema,
    not has_schema_privilege(current_user, 'public', 'CREATE') as cannot_create_in_public_schema,
    not has_table_privilege(current_user, 'game.schema_migrations', 'SELECT') as cannot_read_migration_history
`);

if (Object.values(privileges.rows[0]).some(value => value !== true)) {
  throw new Error(`Privilégios inesperados: ${JSON.stringify(privileges.rows[0])}`);
}

await client.query('begin');
const inserted = await client.query(
  "insert into game.players (display_name, normalized_name, auth_provider) values ('Teste Segurança', 'teste segurança', 'guest') returning id"
);
if (!inserted.rows[0]?.id) throw new Error('Usuário da aplicação não consegue gravar dados válidos.');
await client.query('rollback');

let ddlWasDenied = false;
try {
  await client.query('create table game.should_never_exist (id integer)');
} catch (error) {
  ddlWasDenied = error.code === '42501';
}
if (!ddlWasDenied) throw new Error('Usuário da aplicação conseguiu executar DDL.');

await client.end();
console.log('Segurança do banco verificada: acesso mínimo e DDL bloqueado para tronos_app.');
