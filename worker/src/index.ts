interface Env {
  SOCIAL_ACTOR?: string;
  CACHE_TTL_SECONDS?: string;
  ALLOWED_ORIGINS?: string;
  TURNSTILE_SECRET_KEY?: string;
  GITHUB_TOKEN?: string;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8'
};

function allowedOrigin(request: Request, env: Env) {
  const requestOrigin = request.headers.get('Origin') || '';
  const configured = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!requestOrigin) {
    return configured[0] || '*';
  }

  if (!configured.length || configured.includes('*')) {
    return requestOrigin;
  }

  return configured.includes(requestOrigin) ? requestOrigin : '';
}

function corsHeaders(request: Request, env: Env) {
  const origin = allowedOrigin(request, env);
  if (!origin) {
    return {
      ...JSON_HEADERS,
      'Vary': 'Origin'
    };
  }

  return {
    ...JSON_HEADERS,
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function jsonResponse(request: Request, env: Env, payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders(request, env)
  });
}

async function getSocialFeed(request: Request, env: Env, ctx: ExecutionContext) {
  const url = new URL(request.url);
  const actor = url.searchParams.get('actor') || env.SOCIAL_ACTOR || 'austinpuzzles.com';
  const limit = Math.min(Number(url.searchParams.get('limit') || 5), 10);

  const apiUrl = `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(actor)}&limit=${limit}`;
  const cacheKey = new Request(apiUrl);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    return new Response(cached.body, {
      status: 200,
      headers: {
        ...corsHeaders(request, env),
        'Cache-Control': `public, max-age=${env.CACHE_TTL_SECONDS || '900'}`
      }
    });
  }

  const response = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    return jsonResponse(request, env, { error: 'Unable to load social feed.' }, response.status);
  }

  const payload = await response.json<any>();
  const posts = (payload.feed || []).map((entry: any) => ({
    uri: entry.post?.uri,
    text: entry.post?.record?.text,
    indexedAt: entry.post?.indexedAt,
    author: {
      handle: entry.post?.author?.handle,
      displayName: entry.post?.author?.displayName
    }
  }));

  const body = JSON.stringify({ actor, posts });

  const workerResponse = new Response(body, {
    headers: {
      ...corsHeaders(request, env),
      'Cache-Control': `public, max-age=${env.CACHE_TTL_SECONDS || '900'}`
    }
  });

  ctx.waitUntil(cache.put(cacheKey, workerResponse.clone()));
  return workerResponse;
}

async function getPuzzleNews(request: Request, env: Env, ctx: ExecutionContext) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || 'topic:jigsaw-puzzle OR topic:puzzle OR topic:crossword';
  const perPage = Math.min(Number(url.searchParams.get('per_page') || 6), 15);

  const apiUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${perPage}`;
  const cacheKey = new Request(apiUrl);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);

  if (cached) {
    return new Response(cached.body, {
      status: 200,
      headers: {
        ...corsHeaders(request, env),
        'Cache-Control': `public, max-age=${env.CACHE_TTL_SECONDS || '900'}`
      }
    });
  }

  const headers: HeadersInit = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'austin-puzzles-worker'
  };

  if (env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }

  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    return jsonResponse(request, env, { error: 'Unable to load puzzle news.' }, response.status);
  }

  const payload = await response.json<any>();
  const repositories = (payload.items || []).map((item: any) => ({
    name: item.name,
    full_name: item.full_name,
    html_url: item.html_url,
    description: item.description,
    updated_at: item.updated_at,
    language: item.language,
    stars: item.stargazers_count
  }));

  const body = JSON.stringify({ repositories });
  const workerResponse = new Response(body, {
    headers: {
      ...corsHeaders(request, env),
      'Cache-Control': `public, max-age=${env.CACHE_TTL_SECONDS || '900'}`
    }
  });

  ctx.waitUntil(cache.put(cacheKey, workerResponse.clone()));
  return workerResponse;
}

async function verifyTurnstile(request: Request, env: Env) {
  if (!env.TURNSTILE_SECRET_KEY) {
    return jsonResponse(request, env, {
      success: false,
      error: 'TURNSTILE_SECRET_KEY is not configured.'
    }, 503);
  }

  let token = '';
  try {
    const payload = await request.json<any>();
    token = (payload?.token || '').toString();
  } catch {
    return jsonResponse(request, env, { success: false, error: 'Invalid request body.' }, 400);
  }

  if (!token) {
    return jsonResponse(request, env, { success: false, error: 'Token required.' }, 400);
  }

  const body = new URLSearchParams();
  body.set('secret', env.TURNSTILE_SECRET_KEY);
  body.set('response', token);

  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) {
    body.set('remoteip', ip);
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  const result = await response.json<any>();
  return jsonResponse(request, env, {
    success: !!result.success,
    challenge_ts: result.challenge_ts,
    hostname: result.hostname,
    errors: result['error-codes'] || []
  }, result.success ? 200 : 400);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env)
      });
    }

    if (request.method === 'GET' && (url.pathname === '/api/social' || url.pathname === '/social')) {
      return getSocialFeed(request, env, ctx);
    }

    if (request.method === 'GET' && (url.pathname === '/api/news' || url.pathname === '/news')) {
      return getPuzzleNews(request, env, ctx);
    }

    if (request.method === 'POST' && (url.pathname === '/api/verify-turnstile' || url.pathname === '/verify-turnstile')) {
      return verifyTurnstile(request, env);
    }

    if (url.pathname === '/' || url.pathname === '/api') {
      return jsonResponse(request, env, {
        name: 'Austin Puzzle Exchange Worker API',
        endpoints: ['/api/social', '/api/news', '/api/verify-turnstile']
      });
    }

    return jsonResponse(request, env, { error: 'Not found.' }, 404);
  }
};
