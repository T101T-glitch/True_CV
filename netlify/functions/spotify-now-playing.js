const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

exports.handler = async function (event, context) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET or SPOTIFY_REFRESH_TOKEN in env' })
    };
  }

  try {
    // Refresh access token
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      return { statusCode: tokenRes.status, body: text };
    }

    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;

    // Query currently-playing
    const nowRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (nowRes.status === 204) {
      return { statusCode: 200, body: JSON.stringify({ playing: false }) };
    }

    const nowJson = await nowRes.json();
    return { statusCode: 200, body: JSON.stringify(nowJson) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
