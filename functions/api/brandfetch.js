// Cloudflare Pages Function to proxy Brandfetch API requests
// This keeps the API key secure on the server side

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  const domain = url.searchParams.get('domain');

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = env.BRANDFETCH_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key not configured' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Search endpoint
    if (query) {
      const searchUrl = `https://api.brandfetch.io/v2/search/${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Brand details endpoint (fetch full brand data including logos)
    if (domain) {
      const brandUrl = `https://api.brandfetch.io/v2/brands/${encodeURIComponent(domain)}`;
      const response = await fetch(brandUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Missing query parameter (q or domain)' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch from Brandfetch API' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
