import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const read = (path) => {
  const file = fileURLToPath(new URL(path, import.meta.url));
  assert.ok(existsSync(file), `required setup artifact is missing: ${path}`);
  return readFileSync(file, 'utf8');
};

test('local Compose provisions isolated database credentials for all seven services', () => {
  const compose = read('../../compose.yaml');
  const postgresInit = read('../postgres/init/10-create-databases.sh');
  const mongoInit = read('../mongo/init/10-create-databases.js');
  const envExample = read('../../.env.example');

  for (const service of ['postgres', 'mongo']) {
    assert.match(compose, new RegExp(`^\\s{2}${service}:`, 'm'));
    assert.match(compose, new RegExp(`${service}[-_](?:data|init)`));
  }

  for (const name of ['auth', 'catalog', 'orders', 'prices', 'faq']) {
    assert.match(postgresInit, new RegExp(`\\b${name}_db\\b`));
    assert.match(postgresInit, new RegExp(`\\b${name}_app\\b`));
    assert.match(envExample, new RegExp(`^${name.toUpperCase()}_DB_PASSWORD=`, 'm'));
  }
  assert.match(postgresInit, /REVOKE CONNECT ON DATABASE/);
  assert.match(postgresInit, /GRANT CONNECT ON DATABASE/);

  for (const name of ['recommendations', 'cocktails']) {
    assert.match(mongoInit, new RegExp(`\\b${name}_db\\b`));
    assert.match(mongoInit, new RegExp(`\\b${name}_app\\b`));
    assert.match(envExample, new RegExp(`^${name.toUpperCase()}_DB_PASSWORD=`, 'm'));
  }

  assert.equal((compose.match(/healthcheck:/g) ?? []).length, 2);
  assert.match(compose, /pg_isready/);
  assert.match(compose, /mongosh/);
});

test('database startup instructions document the local initialization workflow', () => {
  const readme = read('../../README.md');
  assert.match(readme, /docker compose up/i);
  assert.match(readme, /\.env\.example/);
  assert.match(readme, /auth_db/);
  assert.match(readme, /recommendations_db/);
});
