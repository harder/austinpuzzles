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

test('built page closes map data script and prioritizes the Southwest location', async () => {
  const home = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(home, /<script[^>]*id="map-locations-data"[^>]*>[^<]*<\/script>/);
  assert.ok(home.indexOf('Southwest Austin Puzzle Exchange') < home.indexOf('NW Hills Puzzle Swap'));
  assert.doesNotMatch(home, /Open-Source Puzzle News|id="repo-news"|bluesky-feed/);
  assert.match(home, /Show X timeline/);
  assert.match(home, /Visit the Group/);
  assert.doesNotMatch(home, /class="fb-page"/);
});

test('community page links both Facebook destinations without a broken Page iframe', async () => {
  const social = await readFile(new URL('../dist/social/index.html', import.meta.url), 'utf8');
  assert.match(social, /https:\/\/www\.facebook\.com\/atxpuzzles/);
  assert.match(social, /https:\/\/www\.facebook\.com\/groups\/austinpuzzles/);
  assert.doesNotMatch(social, /class="fb-page"/);
});

test('legacy news URL points to the active community page', async () => {
  const redirect = await readFile(new URL('../dist/news.html', import.meta.url), 'utf8');
  assert.match(redirect, /url=\/social\//);
  assert.doesNotMatch(redirect, /#news/);
});

test('hero link hover does not animate its layout gap', async () => {
  const styles = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.doesNotMatch(styles, /\.text-link:hover\s*\{[^}]*gap\s*:/);
  assert.doesNotMatch(styles, /transition:\s*gap\b/);
});

test('built contact form retains provider-side CAPTCHA', async () => {
  const about = await readFile(new URL('../dist/about/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(about, /name="_captcha"\s+value="false"/);
});
