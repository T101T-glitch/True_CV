// Netlify Function: la-liga-standings
// Fetches La Liga standings from football-data.org and returns top N rows.
// Requires env var FOOTBALL_DATA_TOKEN (get a free key at https://www.football-data.org/client/register)
// Competition code for La Liga: 2014
// Rate limits apply; basic caching added.

let cache = { timestamp: 0, data: null };
const CACHE_MS = 1000 * 60 * 15; // 15 minutes

export async function handler(event, context) {
  const apiKey = process.env.FOOTBALL_DATA_TOKEN;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing FOOTBALL_DATA_TOKEN env var.' })
    };
  }

  const top = Number(event.queryStringParameters?.top || 5);
  const limit = top > 0 && top <= 20 ? top : 5;

  // Serve from cache if fresh
  if (cache.data && Date.now() - cache.timestamp < CACHE_MS) {
    return {
      statusCode: 200,
      body: JSON.stringify({ source: 'cache', standings: cache.data.slice(0, limit) })
    };
  }

  try {
    const res = await fetch('https://api.football-data.org/v4/competitions/2014/standings', {
      headers: { 'X-Auth-Token': apiKey }
    });
    if (!res.ok) {
      const text = await res.text();
      return { statusCode: res.status, body: text };
    }
    const json = await res.json();
    const table = json?.standings?.[0]?.table || [];
    const simplified = table.map(r => ({
      position: r.position,
      team: r.team?.name,
      crest: r.team?.crest || null,
      played: r.playedGames,
      won: r.won,
      draw: r.draw,
      lost: r.lost,
      goalsFor: r.goalsFor,
      goalsAgainst: r.goalsAgainst,
      goalDifference: r.goalDifference,
      points: r.points,
      form: r.form || null
    }));
    cache = { timestamp: Date.now(), data: simplified };
    return {
      statusCode: 200,
      body: JSON.stringify({ source: 'live', standings: simplified.slice(0, limit) })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
}
