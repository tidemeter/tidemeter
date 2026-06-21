import * as migration_20260405_190832 from './20260405_190832';
import * as migration_20260621_000000_websites_public_id from './20260621_000000_websites_public_id';

export const migrations = [
  {
    up: migration_20260405_190832.up,
    down: migration_20260405_190832.down,
    name: '20260405_190832'
  },
  {
    up: migration_20260621_000000_websites_public_id.up,
    down: migration_20260621_000000_websites_public_id.down,
    name: '20260621_000000_websites_public_id'
  },
];
