import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';

test('chat gift script and warm theme are served by the public asset allowlist', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ikimiz-gift-assets-'));
  const app = createApp({ dataDir: dir });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  try {
    const gifts = await fetch(`${base}/gifts.js`);
    assert.equal(gifts.status, 200);
    assert.match(gifts.headers.get('content-type'), /javascript/);
    assert.match(await gifts.text(), /data-gift-picker/);

    const warm = await fetch(`${base}/warm.css`);
    assert.equal(warm.status, 200);
    assert.match(warm.headers.get('content-type'), /css/);
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
