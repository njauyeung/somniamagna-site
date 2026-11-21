// Run: npm test. Checks that only a genuine, unexpired, correctly-addressed token from an allowed email gets through.
import { verifyAccessJwt } from '../worker/access.js';
import assert from 'node:assert/strict';

const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const other = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'k1' };
const fetcher = async () => ({ ok: true, json: async () => ({ keys: [jwk] }) });
const TEAM = 'https://team.cloudflareaccess.com', AUD = 'abc123', EMAILS = ['me@example.com', 'backup@example.com'];
const cfg = { teamDomain: TEAM, aud: AUD, emails: EMAILS };

async function mint(claims, key = pair.privateKey, kid = 'k1') {
  const h = enc({ alg: 'RS256', kid }), p = enc({ iss: TEAM, aud: [AUD], email: 'me@example.com', exp: Math.floor(Date.now() / 1000) + 600, ...claims });
  const sig = Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${h}.${p}`))).toString('base64url');
  return `${h}.${p}.${sig}`;
}
const ok = (t, c = cfg) => verifyAccessJwt(t, c, fetcher);

assert.deepEqual(await ok(await mint({})), { email: 'me@example.com' }, 'valid token passes');
assert.deepEqual(await ok(await mint({ email: 'Backup@Example.com' })), { email: 'backup@example.com' }, 'backup email passes, case-insensitive');
assert.equal(await ok(await mint({ email: 'stranger@example.com' })), null, 'other email rejected');
assert.equal(await ok(await mint({ aud: ['someone-elses-app'] })), null, 'wrong app rejected');
assert.equal(await ok(await mint({ exp: Math.floor(Date.now() / 1000) - 5 })), null, 'expired rejected');
assert.equal(await ok(await mint({ iss: 'https://evil.cloudflareaccess.com' })), null, 'wrong issuer rejected');
assert.equal(await ok(await mint({}, other.privateKey)), null, 'token signed with a different key rejected');
assert.equal(await ok(await mint({}, pair.privateKey, 'unknown-kid')), null, 'unknown key id rejected');
const good = await mint({}), [h, p, s] = good.split('.');
assert.equal(await ok(`${h}.${enc({ iss: TEAM, aud: [AUD], email: 'stranger@example.com', exp: 9999999999 })}.${s}`), null, 'tampered payload rejected');
assert.equal(await ok(''), null, 'missing token rejected');
assert.equal(await ok(null), null);
assert.equal(await ok('a.b.c'), null, 'garbage rejected');
assert.equal(await ok(good, { teamDomain: TEAM, aud: '', emails: EMAILS }), null, 'unset audience rejects everything');
console.log('access tests: all passed');
