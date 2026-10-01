import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../worker/src/index.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText;
const worker = (await import(`data:text/javascript,${encodeURIComponent(javascript)}`)).default;
const env = { SOCIAL_ACTOR: 'austinpuzzles.com', GITHUB_TOKEN: 'test-token' };
const context = { waitUntil() {} };

test('feed routes reject caller-controlled queries before fetching upstream', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Unexpected upstream request'); };
  try {
    for (const path of ['/api/news?q=another-topic', '/api/news?per_page=15', '/api/social?actor=someone-else', '/api/social?limit=10']) {
      const response = await worker.fetch(new Request(`https://worker.example${path}`), env, context);
      assert.equal(response.status, 400, path);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('news requests use one fixed GitHub search and cache key', async () => {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  let fetchedUrl;
  let cacheKey;
  globalThis.caches = {
    default: {
      match: async (key) => { cacheKey = key.url; return undefined; },
      put: async () => {}
    }
  };
  globalThis.fetch = async (url) => {
    fetchedUrl = url;
    return new Response(JSON.stringify({ items: [] }), { status: 200 });
  };
  try {
    const response = await worker.fetch(new Request('https://worker.example/api/news'), env, context);
    assert.equal(response.status, 200);
    assert.equal(cacheKey, fetchedUrl);
    const url = new URL(fetchedUrl);
    assert.equal(url.hostname, 'api.github.com');
    assert.equal(url.searchParams.get('q'), 'topic:jigsaw-puzzle');
    assert.equal(url.searchParams.get('per_page'), '6');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.caches = originalCaches;
  }
});

test('social requests use the configured actor and a fixed page size', async () => {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  let fetchedUrl;
  let cacheKey;
  globalThis.caches = {
    default: {
      match: async (key) => { cacheKey = key.url; return undefined; },
      put: async () => {}
    }
  };
  globalThis.fetch = async (url) => {
    fetchedUrl = url;
    return new Response(JSON.stringify({ feed: [] }), { status: 200 });
  };
  try {
    const response = await worker.fetch(new Request('https://worker.example/api/social'), env, context);
    assert.equal(response.status, 200);
    assert.equal(cacheKey, fetchedUrl);
    const url = new URL(fetchedUrl);
    assert.equal(url.hostname, 'public.api.bsky.app');
    assert.equal(url.searchParams.get('actor'), 'austinpuzzles.com');
    assert.equal(url.searchParams.get('limit'), '5');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.caches = originalCaches;
  }
});
