export function GET() {
  return new Response(
    ['User-agent: *', 'Allow: /', 'Sitemap: https://austinpuzzles.com/sitemap-index.xml'].join('\n'),
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      }
    }
  );
}
