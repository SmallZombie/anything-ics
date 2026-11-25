import { assertEquals } from '@std/assert';
import { defaultHttpRetryWithBackoffOption, RetryableHttpError, retryCall } from './BaseUtil.ts';
import { assertInstanceOf } from '@std/assert/instance-of';

const noDealyRetryOption = { ...defaultHttpRetryWithBackoffOption, baseDelayMs: 3 };
const testMaxRetryAttempt = noDealyRetryOption.baseDelayMs;

Deno.test('retryCall - retries exactly maxRetryAttempt times then throws HttpError', async () => {
  const maxRetryAttempt = 3;
  let calls = 0;
  const fn = async () => {
    calls++;
    return new Response('retry', { status: 502 });
  };

  let actualErr: unknown;
  try {
    await retryCall(fn, {
      baseDelayMs: 0,
      maxDelayMs: 60_000,
      maxRetryAttempt,
    });
  } catch (err) {
    actualErr = err;
  }

  assertInstanceOf(actualErr, RetryableHttpError);
  assertEquals(calls, maxRetryAttempt + 1);
});

Deno.test('retryCall - stops retrying on first success', async () => {
  const maxRetryAttempt = 5;
  const lastErrIndex = 3; // 1-indexed: fail twice, succeed on 3rd
  let calls = 0;
  const fn = async () => {
    calls++;
    if (calls > lastErrIndex) {
      return new Response('ok', { status: 200 });
    }
    return new Response('retry', { status: 502 });
  };

  const res = await retryCall(fn, {
    baseDelayMs: 0,
    maxDelayMs: 6000,
    maxRetryAttempt,
  });

  assertEquals(res.status, 200);
  assertEquals(calls, lastErrIndex);
});

Deno.test('retryCall - Retryable HTTP status: retries', async () => {
  for (const retryableStatus of RetryableHttpError.getRetryableStatusCode()) {
    let calls = 0;
    let actualErr: any;
    const fn = async () => {
      calls++;
      return new Response('ok', { status: retryableStatus });
    };

    try {
      await retryCall(fn, noDealyRetryOption);
    } catch (error) {
      actualErr = error;
    }

    assertInstanceOf(actualErr, RetryableHttpError);
    assertEquals(calls, testMaxRetryAttempt + 1);
    assertEquals(actualErr.status, retryableStatus);
  }
});

Deno.test('retryCall - status 400: no retry', async () => {
  let calls = 0;
  const fn = async () => {
    calls++;
    return new Response('ok', { status: 400 });
  };

  const resp = await retryCall(fn);

  assertEquals(calls, 1);
  assertEquals(resp.status, 400);
});

Deno.test('retryCall - TCP timeout: retries', async () => {
  const expctedErr = new TypeError('fetch failed');
  (expctedErr as any).cause = Object.assign(
    new Error('client error (Connect): tcp connect error: Connection timed out (os error 110)'),
    { code: 'UND_ERR_CONNECT_TIMEOUT' },
  );
  let calls = 0;
  const fn = async () => {
    calls++;
    throw expctedErr;
  };

  let actualErr;
  try {
    await retryCall(fn, noDealyRetryOption);
  } catch (err) {
    actualErr = err;
  }

  assertEquals(calls, 1 + testMaxRetryAttempt);
  assertEquals(expctedErr, actualErr);
});

Deno.test('retryCall - Abort error: retries', async () => {
  let calls = 0;
  const controller = new AbortController();
  const fn = async () => {
    calls++;
    controller.abort();
    controller.signal.throwIfAborted();
    return new Response('never');
  };

  let actualErr;
  try {
    await retryCall(fn, noDealyRetryOption);
  } catch (err) {
    actualErr = err;
  }

  assertInstanceOf(actualErr, DOMException);
  assertEquals(actualErr.name, 'AbortError');
  assertEquals(calls, 1 + testMaxRetryAttempt);
});

Deno.test('retryCall - Unkown error: no retry', async () => {
  const expctedErr = new TypeError();
  let calls = 0;
  const fn = async () => {
    calls++;
    throw expctedErr;
  };

  let actualErr;
  try {
    await retryCall(fn);
  } catch (err) {
    actualErr = err;
  }

  assertEquals(calls, 1);
  assertEquals(expctedErr, actualErr);
});
