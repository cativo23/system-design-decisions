import { describe, expect, it } from 'vitest';
import { checkResponse, describeFetchError, findFontHref } from '../../scripts/health-gate.ts';

const SHA = 'abc1234';
const ROBOTS_META = '<meta name="robots" content="noindex, nofollow">';
const NOINDEX = { 'X-Robots-Tag': 'noindex, nofollow' };

function res(status: number, headers: Record<string, string>, body: string) {
  return { status, headers: new Headers(headers), body };
}

const html = (body: string, head = ROBOTS_META) => `<html><head>${head}</head><body>${body}</body></html>`;
const INDEX = html('<ul><li><a href="/cards/saga/">Saga</a></li></ul>');
const CARD = html('<h1>Saga</h1><h2>TL;DR</h2>');

describe('checkResponse: version', () => {
  it('should pass when the body equals the expected SHA (trimmed)', () => {
    expect(checkResponse('version', res(200, {}, `${SHA}\n`), SHA)).toEqual([]);
  });

  it('should fail on a status other than 200', () => {
    expect(checkResponse('version', res(502, {}, 'Bad Gateway'), SHA)).toEqual([
      expect.stringMatching(/^GET \/version\.txt: .*502/),
    ]);
  });

  it('should fail on a redirect, since redirects are not followed', () => {
    expect(checkResponse('version', res(301, { Location: '/x' }, ''), SHA)).toEqual([
      expect.stringMatching(/^GET \/version\.txt: .*301/),
    ]);
  });

  it('should fail when the body is another version (a stale container)', () => {
    expect(checkResponse('version', res(200, {}, 'old0000\n'), SHA)).toEqual([
      expect.stringMatching(/^GET \/version\.txt: .*old0000.*abc1234/),
    ]);
  });
});

describe('checkResponse: index', () => {
  it('should pass with the header, the meta and the link to Saga', () => {
    expect(checkResponse('index', res(200, NOINDEX, INDEX), SHA)).toEqual([]);
  });

  it('should fail on a status other than 200', () => {
    expect(checkResponse('index', res(404, NOINDEX, INDEX), SHA)).toEqual([expect.stringMatching(/^GET \/: .*404/)]);
  });

  it('should fail when X-Robots-Tag is missing', () => {
    expect(checkResponse('index', res(200, {}, INDEX), SHA)).toEqual(['GET /: X-Robots-Tag missing']);
  });

  it('should fail when X-Robots-Tag lacks noindex', () => {
    expect(checkResponse('index', res(200, { 'X-Robots-Tag': 'nofollow' }, INDEX), SHA)).toEqual([
      expect.stringMatching(/^GET \/: X-Robots-Tag .*noindex/),
    ]);
  });

  it('should match noindex in the header case-insensitively', () => {
    expect(checkResponse('index', res(200, { 'X-Robots-Tag': 'NoIndex' }, INDEX), SHA)).toEqual([]);
  });

  it('should fail when the robots meta tag is missing', () => {
    const body = html('<a href="/cards/saga/">Saga</a>', '');
    expect(checkResponse('index', res(200, NOINDEX, body), SHA)).toEqual([expect.stringMatching(/^GET \/: .*robots meta/)]);
  });

  it('should fail when the link to /cards/saga/ is missing', () => {
    expect(checkResponse('index', res(200, NOINDEX, html('<p>empty</p>')), SHA)).toEqual([
      expect.stringMatching(/^GET \/: .*\/cards\/saga\//),
    ]);
  });
});

describe('checkResponse: card', () => {
  it('should pass with the header, the meta and the Saga H1', () => {
    expect(checkResponse('card', res(200, NOINDEX, CARD), SHA)).toEqual([]);
  });

  it('should fail when X-Robots-Tag is missing', () => {
    expect(checkResponse('card', res(200, {}, CARD), SHA)).toEqual(['GET /cards/saga/: X-Robots-Tag missing']);
  });

  it('should fail when the robots meta tag is missing', () => {
    expect(checkResponse('card', res(200, NOINDEX, html('<h1>Saga</h1>', '')), SHA)).toEqual([
      expect.stringMatching(/^GET \/cards\/saga\/: .*robots meta/),
    ]);
  });

  it('should pass when the H1 wraps the title in an inline element (typed title)', () => {
    const typed = html('<h1 class="is-typed" style="--len:4"><span class="typed">Saga</span></h1>');
    expect(checkResponse('card', res(200, NOINDEX, typed), SHA)).toEqual([]);
  });

  it('should fail when the Saga H1 is missing', () => {
    expect(checkResponse('card', res(200, NOINDEX, html('<h1>Outbox</h1>')), SHA)).toEqual([
      expect.stringMatching(/^GET \/cards\/saga\/: .*H1/),
    ]);
  });

  it('should report every problem at once', () => {
    expect(checkResponse('card', res(200, {}, html('<p>x</p>', '')), SHA)).toHaveLength(3);
  });
});

// A failed fetch rejects with TypeError("fetch failed"); the useful reason is in its cause.
function fetchFailure(cause?: Error) {
  return Object.assign(new TypeError('fetch failed'), cause ? { cause } : {});
}

describe('describeFetchError', () => {
  it('should use the cause message when there is one', () => {
    const cause = new Error('getaddrinfo ENOTFOUND example.invalid');
    expect(describeFetchError(fetchFailure(cause))).toBe('getaddrinfo ENOTFOUND example.invalid');
  });

  // Dual-stack hosts: Node tries IPv6 and IPv4 and rejects with an AggregateError whose own message is "".
  it('should list every attempt when the cause is an AggregateError with an empty message', () => {
    const cause = new AggregateError(
      [new Error('connect ECONNREFUSED ::1:8080'), new Error('connect ECONNREFUSED 127.0.0.1:8080')],
      '',
    );
    expect(describeFetchError(fetchFailure(cause))).toBe(
      'connect ECONNREFUSED ::1:8080; connect ECONNREFUSED 127.0.0.1:8080',
    );
  });

  it('should fall back to the error message when there is no cause (e.g. a timeout)', () => {
    const timeout = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    expect(describeFetchError(timeout)).toBe('The operation was aborted due to timeout');
  });
});

describe('checkResponse: font (R13)', () => {
  const FONT = '/_astro/fonts/abc.woff2';
  const OK = { ...NOINDEX, 'Cache-Control': 'public, max-age=31536000, immutable' };
  const check = (r: ReturnType<typeof res>) => checkResponse('font', r, SHA, FONT);

  it('should pass with 200, noindex and an immutable cache header', () => {
    expect(check(res(200, OK, ''))).toEqual([]);
  });

  it('should fail on a non-200 status and name the font URL', () => {
    expect(check(res(404, OK, ''))).toEqual([expect.stringMatching(/^GET \/_astro\/fonts\/abc\.woff2: .*404/)]);
  });

  it('should fail when X-Robots-Tag is missing (a location block dropped it)', () => {
    expect(check(res(200, { 'Cache-Control': OK['Cache-Control'] }, ''))).toEqual([
      'GET /_astro/fonts/abc.woff2: X-Robots-Tag missing',
    ]);
  });

  it('should fail when X-Robots-Tag lacks noindex', () => {
    expect(check(res(200, { ...OK, 'X-Robots-Tag': 'nofollow' }, ''))).toEqual([expect.stringMatching(/noindex/)]);
  });

  it('should fail when Cache-Control lacks immutable', () => {
    expect(check(res(200, { ...NOINDEX, 'Cache-Control': 'max-age=60' }, ''))).toEqual([
      expect.stringMatching(/^GET \/_astro\/fonts\/abc\.woff2: .*immutable/),
    ]);
  });

  it('should fail when Cache-Control is missing', () => {
    expect(check(res(200, NOINDEX, ''))).toEqual([expect.stringMatching(/Cache-Control.*immutable/)]);
  });

  it('should fail on a redirect', () => {
    expect(check(res(301, { Location: '/x' }, ''))).toEqual([expect.stringMatching(/301/)]);
  });
});

describe('findFontHref', () => {
  it('should return the first preloaded font href', () => {
    const body = html('', '<link rel="preload" href="/_astro/fonts/a.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/_astro/fonts/b.woff2" as="font">');
    expect(findFontHref(body)).toBe('/_astro/fonts/a.woff2');
  });

  it('should read attributes in any order', () => {
    expect(findFontHref(html('', '<link as="font" crossorigin href="/f.woff2" rel="preload">'))).toBe('/f.woff2');
  });

  it('should ignore preloads that are not fonts', () => {
    expect(findFontHref(html('', '<link rel="preload" href="/a.css" as="style">'))).toBeNull();
  });

  it('should return null when there is no preload link', () => {
    expect(findFontHref(html('<p>none</p>'))).toBeNull();
  });
});
