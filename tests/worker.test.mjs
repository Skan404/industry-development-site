import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { contact } from '../worker/index.mjs';

const payload = { name: 'Jan Kowalski', company: 'Firma', email: 'jan@example.com', phone: '', companyUrl: '', requestId: '12345678-1234-4123-8123-123456789abc', 'cf-turnstile-response': 'token' };
const request = (data = payload, headers = {}) => new Request('https://www.inddev.pl/api/contact', { method: 'POST', headers: { Origin: 'https://www.inddev.pl', 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...headers }, body: JSON.stringify(data) });
const verified = async () => Response.json({ success: true, hostname: 'www.inddev.pl', action: 'contact' });
function setup() {
  const sent = [];
  return { sent, env: { TURNSTILE_SECRET: 'test-only', CONTACT_LIMITER: { limit: async () => ({ success: true }) }, EMAIL: { send: async value => { sent.push(value); return { messageId: 'test' }; } } } };
}
test('valid request sends only to fixed recipient, uses Reply-To and matching receipt', async () => {
  const { env, sent } = setup();
  const response = await contact(request({ ...payload, to: 'attacker@example.com' }), env, verified);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { ok: true, requestId: payload.requestId });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'szymon.kaniewski.work@gmail.com');
  assert.equal(sent[0].from, 'kontakt@inddev.pl');
  assert.equal(sent[0].replyTo, payload.email);
});
test('invalid input, honeypot and header injection cannot send', async () => {
  for (const data of [null, [], { ...payload, name: ' ' }, { ...payload, email: 'a@b.com\r\nBcc: x@y.com' }, { ...payload, company: {} }, { ...payload, companyUrl: 'spam' }, { ...payload, phone: 'abc' }, { ...payload, name: 'ą'.repeat(101) }, { ...payload, requestId: 'bad' }, { ...payload, 'cf-turnstile-response': '' }]) {
    const { env, sent } = setup();
    assert.ok((await contact(request(data), env, verified)).status >= 400);
    assert.equal(sent.length, 0);
  }
});
test('method, origin, content type, body size and missing config fail closed', async () => {
  const { env, sent } = setup();
  assert.equal((await contact(new Request('https://www.inddev.pl/api/contact'), env)).status, 405);
  assert.equal((await contact(request(payload, { Origin: 'https://evil.example' }), env)).status, 403);
  assert.equal((await contact(request(payload, { 'Content-Type': 'text/plain' }), env)).status, 415);
  assert.equal((await contact(request({ ...payload, extra: 'x'.repeat(9000) }), env)).status, 413);
  assert.equal((await contact(request(), {})).status, 503);
  assert.equal(sent.length, 0);
});
test('rate limit blocks verification and email', async () => {
  const { env, sent } = setup(); env.CONTACT_LIMITER.limit = async () => ({ success: false });
  const result = await contact(request(), env, () => { throw new Error('must not verify'); });
  assert.equal(result.status, 429); assert.equal(result.headers.get('retry-after'), '60'); assert.equal(sent.length, 0);
});
test('Turnstile failure, wrong hostname/action, network outage prevent sending', async () => {
  for (const result of [{ success: false }, { success: true, hostname: 'evil.example', action: 'contact' }, { success: true, hostname: 'www.inddev.pl', action: 'other' }]) {
    const { env, sent } = setup();
    assert.equal((await contact(request(), env, async () => Response.json(result))).status, 422);
    assert.equal(sent.length, 0);
  }
  const { env } = setup();
  assert.equal((await contact(request(), env, async () => { throw new Error('offline'); })).status, 503);
});
test('email error is generic and does not retry automatically', async () => {
  const { env } = setup(); let calls = 0;
  env.EMAIL.send = async () => { calls++; throw new Error('sensitive provider detail'); };
  const result = await contact(request(), env, verified);
  assert.equal(result.status, 502); assert.equal(calls, 1);
  assert.ok(!(await result.text()).includes('sensitive'));
});
test('static paths use assets, unknown API is JSON 404', async () => {
  const env = { ASSETS: { fetch: async () => new Response('asset') } };
  assert.equal(await (await worker.fetch(new Request('https://www.inddev.pl/uslugi'), env)).text(), 'asset');
  assert.equal((await worker.fetch(new Request('https://www.inddev.pl/api/unknown'), env)).status, 404);
});
