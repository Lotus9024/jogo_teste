import { MemoryIdentityRepository } from './memoryIdentityRepository.js';
import { PostgresIdentityRepository } from './postgresIdentityRepository.js';

export function createIdentityRepository({ pool, config }) {
  if (pool) return new PostgresIdentityRepository(pool);
  if (config.nodeEnv === 'production') {
    throw new Error('DATABASE_URL é obrigatória em produção para autenticação e sessões.');
  }
  return new MemoryIdentityRepository();
}
