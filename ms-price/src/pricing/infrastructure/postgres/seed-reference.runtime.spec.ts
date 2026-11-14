import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('reference seed command runtime', () => {
  it('loads the seed entrypoint before attempting to contact the catalog', () => {
    const result = spawnSync('pnpm', ['db:seed:reference'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        CATALOG_SERVICE_URL: 'http://127.0.0.1:1',
        PRICES_DB_PASSWORD: 'runtime-smoke-only',
      },
      timeout: 10_000,
    });

    const output = `${result.stdout}\n${result.stderr}`;
    expect(result.status).not.toBeNull();
    expect(output).not.toContain('ERR_MODULE_NOT_FOUND');
    expect(output).toContain('fetch failed');
  });
});
