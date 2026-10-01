import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/serialize.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText;
const { serializeJsonForHtmlScript } = await import(`data:text/javascript,${encodeURIComponent(javascript)}`);

test('map JSON cannot close its script element', () => {
  const location = { name: '</script><img src=x onerror=alert(1)>' };
  const serialized = serializeJsonForHtmlScript([location]);
  assert.ok(!serialized.includes('<'));
  assert.deepEqual(JSON.parse(serialized), [location]);
});

test('built page closes map data script and exposes puzzle news', async () => {
  const home = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(home, /<script[^>]*id="map-locations-data"[^>]*>[^<]*<\/script>/);
  assert.match(home, /id="news"/);
  assert.match(home, /id="repo-news"/);
});

test('built contact form retains provider-side CAPTCHA', async () => {
  const about = await readFile(new URL('../dist/about/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(about, /name="_captcha"\s+value="false"/);
});
