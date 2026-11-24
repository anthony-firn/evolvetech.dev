import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {preparePages} from './cloudflare-install.mjs';
const env = {CF_PAGES: '1', CF_PAGES_COMMIT_SHA: 'a'.repeat(40), CF_PAGES_BRANCH: 'proof-v2', CF_PAGES_URL: 'https://preview.example.pages.dev'};

test('ordinary installs never execute a build or touch the source', () => {
  assert.equal(preparePages({root: '/does-not-exist', env: {}, run: () => { throw Error('must not run'); }}), 'not-pages');
  assert.throws(() => preparePages({root: '/does-not-exist', env: {CF_PAGES: '1'}}), /build identity/);
});

test('Pages replaces only its ephemeral public output, preserves the source, and is idempotent', () => {
  const root = mkdtempSync(join(tmpdir(), 'cf-install-'));
  try {
    mkdirSync(join(root, 'public'));
    writeFileSync(join(root, 'public/original'), 'source');
    let calls = 0;
    const run = (command, args) => {
      calls++; assert.equal(command, 'python3');
      assert.equal(args[0], join(root, 'tools/build_cloudflare.py'));
      mkdirSync(join(root, '.cloudflare/public'), {recursive: true});
      writeFileSync(join(root, '.cloudflare/public/.evolve-cloudflare-build.json'), '{}');
      writeFileSync(join(root, '.cloudflare/public/prepared'), 'output');
      return {status: 0};
    };
    assert.equal(preparePages({root, env, run}), 'prepared');
    assert.equal(readFileSync(join(root, 'public/prepared'), 'utf8'), 'output');
    assert.equal(readFileSync(join(root, '.cloudflare/source-public/original'), 'utf8'), 'source');
    assert.equal(preparePages({root, env, run}), 'already-prepared');
    assert.equal(calls, 1);
  } finally { rmSync(root, {recursive: true}); }
});

test('failed preparation leaves public untouched', () => {
  const root = mkdtempSync(join(tmpdir(), 'cf-install-'));
  try {
    mkdirSync(join(root, 'public'));
    writeFileSync(join(root, 'public/original'), 'source');
    assert.throws(() => preparePages({root, env, run: () => ({status: 1})}), /preparation failed/);
    assert.equal(readFileSync(join(root, 'public/original'), 'utf8'), 'source');
    assert.equal(existsSync(join(root, '.cloudflare/source-public')), false);
  } finally { rmSync(root, {recursive: true}); }
});
