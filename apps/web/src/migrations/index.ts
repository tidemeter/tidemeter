import * as migration_20260405_190832 from './20260405_190832';

export const migrations = [
  {
    up: migration_20260405_190832.up,
    down: migration_20260405_190832.down,
    name: '20260405_190832'
  },
];
