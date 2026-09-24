import { afterEach, describe, expect, it, vi } from 'vitest';
import { send } from './http';

const baseUrl = 'http://127.0.0.1:5000';

function respond(status: number, body: string, contentType = 'application/json') {
  const fetch = vi.fn().mockResolvedValue(new Response(body, { status, headers: { 'Content-Type': contentType } }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

describe('send', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts the body as JSON and returns the response', async () => {
    const fetch = respond(200, '{"model":"M4"}');

    const result = await send(baseUrl, { method: 'POST', path: '/api/machine', body: { model: 'M4' } });

    expect(result).toEqual({ ok: true, value: { model: 'M4' } });
    expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/machine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"model":"M4"}',
    });
  });

  it('returns the problem details of a rejected operation', async () => {
    respond(400, '{"status":400,"title":"The machine rejected the operation.","detail":"Letter A is already plugged."}', 'application/problem+json');

    const result = await send(baseUrl, { method: 'POST', path: '/api/machine/plugs', body: { pair: 'AB' } });

    expect(result).toEqual({
      ok: false,
      problem: { status: 400, title: 'The machine rejected the operation.', detail: 'Letter A is already plugged.' },
    });
  });

  it('describes an error response without problem details', async () => {
    respond(500, 'boom', 'text/plain');

    const result = await send(baseUrl, { method: 'GET', path: '/api/machine' });

    expect(result).toEqual({ ok: false, problem: { status: 500, title: 'The backend returned status 500.' } });
  });

  it('returns null for a response without content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    const result = await send(baseUrl, { method: 'DELETE', path: '/api/keysheets/g1' });

    expect(result).toEqual({ ok: true, value: null });
  });

  it('reports an unreachable backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    const result = await send(baseUrl, { method: 'GET', path: '/api/machine' });

    expect(result).toEqual({
      ok: false,
      problem: { status: 0, title: 'The backend is unreachable.', detail: 'TypeError: fetch failed' },
    });
  });
});
