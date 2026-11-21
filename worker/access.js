// Verifies the login token Cloudflare Access adds to requests (Cf-Access-Jwt-Assertion).
// No libraries: RS256 check with WebCrypto against the team's published keys.

const b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
const json = (s) => JSON.parse(new TextDecoder().decode(b64u(s)));

let jwksCache = { at: 0, keys: null, domain: '' };

async function getKeys(teamDomain, fetcher) {
  if (jwksCache.keys && jwksCache.domain === teamDomain && Date.now() - jwksCache.at < 3600e3) return jwksCache.keys;
  const r = await (fetcher || fetch)(`${teamDomain}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error('could not load Access keys');
  const { keys } = await r.json();
  jwksCache = { at: Date.now(), keys, domain: teamDomain };
  return keys;
}

// Returns the token's claims if it is genuine, unexpired, for this app, and for an allowed email. Otherwise null.
export async function verifyAccessJwt(token, { teamDomain, aud, emails }, fetcher) {
  try {
    if (!token || !teamDomain || !aud) return null;
    const [h, p, sig] = token.split('.');
    if (!h || !p || !sig) return null;
    const head = json(h), claims = json(p);
    if (head.alg !== 'RS256') return null;
    const jwk = (await getKeys(teamDomain, fetcher)).find((k) => k.kid === head.kid);
    if (!jwk) { jwksCache.keys = null; return null; }
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(sig), new TextEncoder().encode(`${h}.${p}`));
    if (!ok) return null;
    const now = Math.floor(Date.now() / 1000);
    if (typeof claims.exp !== 'number' || claims.exp < now) return null;
    if (typeof claims.nbf === 'number' && claims.nbf > now + 60) return null;
    if (claims.iss !== teamDomain) return null;
    const auds = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!auds.includes(aud)) return null;
    const email = String(claims.email || '').toLowerCase();
    if (!email || !emails.includes(email)) return null;
    return { email };
  } catch (e) {
    return null;
  }
}
