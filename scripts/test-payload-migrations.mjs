import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

// Build the image first: docker build -f docker/Dockerfile -t tidemeter:payload-migration-validation .
// Run from the repository root: pnpm test:migrations [image-tag]
// All databases and containers are disposable; no deployment credentials or volumes are used.
const image = process.argv[2] || 'tidemeter:payload-migration-validation';
const prefix = `tm-migration-${process.pid}-${Date.now()}`;
const pg = `${prefix}-db`;
const containers = [];
const migrationName = '20261117_181635_payload_auth_security';
const password = 'Legacy-test-password-123!';
const salt = randomBytes(32).toString('hex');
const hash = pbkdf2Sync(password, salt, 25000, 512, 'sha256').toString('hex');
function docker(...args) {
  return execFileSync('docker', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}
function sql(db, query) {
  return execFileSync('docker', ['exec', '-i', pg, 'psql', '-U', 'test', '-d', db, '-v', 'ON_ERROR_STOP=1', '-Atq'], { input: query, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}
function migrationSQL(name) {
  const source = readFileSync(`apps/web/src/migrations/${name}.ts`, 'utf8');
  const up = source.split('export async function down')[0];
  const match = [...up.matchAll(/db\.execute\(sql`([\s\S]*?)`\)/g)];
  assert.equal(match.length, 1, `Expected one literal SQL block in ${name}`);
  assert.ok(!match[0][1].includes('${'), 'Fixture migration must contain literal SQL');
  return match[0][1];
}
async function api(base, path, data, token) {
  const response = await fetch(`${base}/api/${path}`, {
    method: data === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `JWT ${token}` } : {}) },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(5000),
  });
  return { status: response.status, body: await response.json() };
}
// Inspect Docker's state so the shipped health check triggers initialization.
async function waitForDockerHealth(container, expectFailure = false) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const state = JSON.parse(docker('inspect', '-f', '{{json .State}}', container));
    if (!state.Running) {
      assert.ok(expectFailure, 'Application exited during initialization');
      assert.notEqual(state.ExitCode, 0);
      assert.ok(docker('logs', container).includes(migrationName));
      return;
    }
    assert.ok(state.Health, 'Image must define a Docker health check');
    if (state.Health.Status === 'healthy') {
      assert.ok(!expectFailure, 'Migration failure must not report healthy');
      return;
    }
    assert.notEqual(state.Health.Status, 'unhealthy', JSON.stringify(state.Health.Log));
    await delay(500);
  }
  throw new Error(`Timed out waiting for Docker health for ${container}`);
}
try {
  docker('network', 'create', prefix);
  containers.push(pg);
  docker('run', '-d', '--name', pg, '--network', prefix, '--network-alias', 'db', '--tmpfs', '/var/lib/postgresql/data', '-e', 'POSTGRES_USER=test', '-e', 'POSTGRES_PASSWORD=test', '-e', 'POSTGRES_DB=postgres', 'postgres:16-alpine');
  let connected = false;
  for (let i = 0; i < 80; i++) {
    try { docker('exec', pg, 'pg_isready', '-h', '127.0.0.1', '-U', 'test', '-d', 'postgres'); connected = true; break; } catch { await delay(250); }
  }
  assert.ok(connected, 'Disposable PostgreSQL did not start');
  for (const scenario of ['fresh', 'upgrade', 'existing_column', 'failure']) {
    sql('postgres', `CREATE DATABASE ${scenario};`);
    if (scenario !== 'fresh') {
      for (const name of ['20260405_190832', '20260621_000000_websites_public_id']) {
        sql(scenario, migrationSQL(name));
        sql(scenario, `INSERT INTO payload_migrations(name,batch) VALUES ('${name}',1);`);
      }
      sql(scenario, `INSERT INTO users(id,email,hash,salt) VALUES (1,'legacy@example.com','${hash}','${salt}');
        SELECT setval('users_id_seq',1);
        INSERT INTO users_roles("order",parent_id,value) VALUES (1,1,'admin');
        INSERT INTO users_sessions(_order,_parent_id,id,created_at,expires_at) VALUES (1,1,'existing-session',now(),now()+interval '1 day');
        INSERT INTO websites(name,domain,created_by_id,public_id) VALUES ('Existing website','example.com',1,'ExistingPublicID');`);
      if (scenario === 'existing_column') sql(scenario, `ALTER TABLE users ADD COLUMN reset_password_requested_at timestamp(3) with time zone; UPDATE users SET reset_password_requested_at='2020-01-01T00:00:00Z';`);
      if (scenario === 'failure') sql(scenario, 'ALTER TABLE users RENAME TO unavailable_users;');
    }
    const app = `${prefix}-${scenario}`;
    containers.push(app);
    docker('run', '-d', '--name', app, '--network', prefix, '-p', '127.0.0.1::3000',
      '-e', `DATABASE_URL=postgresql://test:test@db:5432/${scenario}`,
      '-e', `ANALYTICS_DATABASE_URL=postgresql://test:test@db:5432/${scenario}`,
      '-e', 'PAYLOAD_SECRET=disposable-migration-test-secret-123456',
      '-e', 'SESSION_SALT_SECRET=disposable-migration-test-salt', image);
    await waitForDockerHealth(app, scenario === 'failure');
    if (scenario === 'failure') {
      assert.equal(sql(scenario, `SELECT count(*) FROM payload_migrations WHERE name='${migrationName}';`), '0');
      console.log('PASS failed migration blocks readiness and is not recorded');
      continue;
    }
    assert.equal(sql(scenario, "SELECT data_type || ':' || is_nullable FROM information_schema.columns WHERE table_name='users' AND column_name='reset_password_requested_at';"), 'timestamp with time zone:YES');
    assert.equal(sql(scenario, `SELECT count(*) FROM payload_migrations WHERE name='${migrationName}';`), '1');
    if (scenario !== 'fresh') {
      assert.equal(sql(scenario, 'SELECT hash FROM users WHERE id=1;'), hash);
      assert.equal(sql(scenario, 'SELECT salt FROM users WHERE id=1;'), salt);
      assert.equal(sql(scenario, 'SELECT public_id FROM websites;'), 'ExistingPublicID');
      assert.equal(sql(scenario, "SELECT count(*) FROM users_sessions WHERE id='existing-session';"), '1');
      if (scenario === 'existing_column') assert.equal(sql(scenario, "SELECT reset_password_requested_at='2020-01-01T00:00:00Z' FROM users WHERE id=1;"), 't');
    }
    const appliedAnalytics = sql(scenario, 'SELECT name FROM analytics._migrations ORDER BY name;');
    const expectedAnalytics = readdirSync('packages/analytics/drizzle').filter(name => name.endsWith('.sql')).sort();
    assert.deepEqual(appliedAnalytics.split('\n'), expectedAnalytics);
    docker('restart', app);
    await waitForDockerHealth(app);
    const restartedPort = JSON.parse(docker('inspect', '-f', '{{json .NetworkSettings.Ports}}', app))['3000/tcp'][0].HostPort;
    const base = `http://127.0.0.1:${restartedPort}`;
    assert.equal(sql(scenario, `SELECT count(*) FROM payload_migrations WHERE name='${migrationName}';`), '1');
    if (scenario === 'fresh') {
      const created = await api(base, 'users/first-register', { email: 'fresh@example.com', password });
      assert.equal(created.status, 200, 'First-user registration should work after fresh migration');
      assert.equal((await api(base, 'users/login', { email: 'fresh@example.com', password })).status, 200);
    }
    if (scenario === 'upgrade') {
      const login = await api(base, 'users/login', { email: 'legacy@example.com', password });
      assert.equal(login.status, 200, 'Legacy password should authenticate');
      assert.equal((await api(base, 'users/me', undefined, login.body.token)).body.user?.id, 1, 'Login token must authenticate before password reset');
      assert.ok(sql(scenario, 'SELECT hash FROM users WHERE id=1;').startsWith('pbkdf2-sha256-v1:'), 'Legacy hash should upgrade after login');
      assert.equal((await api(base, 'users/login', { email: 'legacy@example.com', password: 'wrong-password' })).status, 401);
      assert.equal((await api(base, 'users/forgot-password', { email: 'legacy@example.com' })).status, 200);
      assert.equal(sql(scenario, 'SELECT reset_password_requested_at IS NOT NULL FROM users WHERE id=1;'), 't');
      const resetToken = sql(scenario, 'SELECT reset_password_token FROM users WHERE id=1;');
      assert.ok(resetToken);
      assert.equal((await api(base, 'users/forgot-password', { email: 'legacy@example.com' })).status, 200);
      assert.equal(sql(scenario, 'SELECT reset_password_token FROM users WHERE id=1;'), resetToken, 'Repeated request must be throttled');
      sql(scenario, "UPDATE users SET login_attempts=5, lock_until=now()+interval '1 hour' WHERE id=1;");
      const newPassword = 'New-test-password-456!';
      assert.equal((await api(base, 'users/reset-password', { token: resetToken, password: newPassword })).status, 200);
      assert.equal(sql(scenario, 'SELECT (login_attempts=0 AND lock_until IS NULL) FROM users WHERE id=1;'), 't');
      const me = await api(base, 'users/me', undefined, login.body.token);
      assert.ok(!me.body.user, 'Password reset must revoke the previous login session');
      assert.equal((await api(base, 'users/login', { email: 'legacy@example.com', password: newPassword })).status, 200);
      assert.equal((await api(base, 'users/login', { email: 'legacy@example.com', password })).status, 401);
    }
    console.log(`PASS ${scenario}: startup migration, data preservation, restart${scenario === 'upgrade' ? ', legacy login/rehash, reset throttle, password reset/session revocation' : ''}`);
  }
} catch (error) {
  for (const container of containers.slice(1)) {
    try { console.error(container, docker('logs', container)); } catch { /* Best-effort test diagnostics. */ }
  }
  throw error;
} finally {
  for (const container of containers.reverse()) {
    try { docker('rm', '-f', container); } catch { /* Cleanup only disposable test resources. */ }
  }
  try { docker('network', 'rm', prefix); } catch { /* Preserve original test error. */ }
}
