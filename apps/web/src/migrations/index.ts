import * as migration_20260405_190832 from './20260405_190832';
import * as migration_20260621_000000_websites_public_id from './20260621_000000_websites_public_id';
import * as migration_20261117_181635_payload_auth_security from './20261117_181635_payload_auth_security';

export const migrations = [
  {
    up: migration_20260405_190832.up,
    down: migration_20260405_190832.down,
    name: '20260405_190832',
  },
  {
    up: migration_20260621_000000_websites_public_id.up,
    down: migration_20260621_000000_websites_public_id.down,
    name: '20260621_000000_websites_public_id',
  },
  {
    up: migration_20261117_181635_payload_auth_security.up,
    down: migration_20261117_181635_payload_auth_security.down,
    name: '20261117_181635_payload_auth_security'
  },
];
