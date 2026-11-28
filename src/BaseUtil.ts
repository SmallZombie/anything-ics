import { join } from '@std/path/join';

class Vcalendar {
  #maxLineLength = 75;

  version: string;
  prodId: string;
  name: string;
  refreshInterval: string;
  calScale: string;
  tzid: string;
  tzoffset: string;
  items: Vevent[];
  #hasChanged: boolean = false;

  constructor(
    version: string,
    prodId: string,
    name: string,
    refreshInterval: string,
    calScale: string,
    tzid: string,
    tzoffset: string,
    items: Vevent[],
  ) {
    this.version = version;
    this.prodId = prodId;
    this.name = name;
    this.refreshInterval = refreshInterval;
    this.calScale = calScale;
    this.tzid = tzid;
    this.tzoffset = tzoffset;
    this.items = items;
  }

  /**
   * 请不要将此函数当作通用函数，此函数可能仅适用于本项目
   * 详见 https://en.wikipedia.org/wiki/ICalendar
   * 详见 https://icalendar.org/iCalendar-RFC-5545
   */
  toString(): string {
    const lines = ['BEGIN:VCALENDAR'];
    lines.push('VERSION:' + this.version);
    lines.push('PRODID:' + this.prodId);
    lines.push('NAME:' + this.name);
    lines.push('REFRESH-INTERVAL;VALUE=DURATION:' + this.refreshInterval);
    lines.push('CALSCALE:' + this.calScale);

    lines.push('BEGIN:VTIMEZONE');
    lines.push('TZID:' + this.tzid);
    lines.push('BEGIN:STANDARD');
    lines.push('DTSTART:19700101T000000');
    lines.push('TZOFFSETTO:' + this.tzoffset);
    lines.push('TZOFFSETFROM:' + this.tzoffset);
    lines.push('END:STANDARD');
    lines.push('END:VTIMEZONE');

    for (const i of this.items) {
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + i.uid);

      if (i.hasChanged) {
        lines.push('DTSTAMP:' + this.dateToDateTime(new Date()));
      } else {
        lines.push('DTSTAMP:' + i.dtstamp);
      }

      const dtstart = i.dtstart.at(-1) === 'Z' ? i.dtstart.slice(0, -1) : i.dtstart;
      lines.push(`DTSTART;${dtstart.length === 8 ? 'VALUE=DATE' : 'TZID=' + this.tzid}:${dtstart}`);

      if (i.dtend) {
        const dtend = i.dtend.at(-1) === 'Z' ? i.dtend.slice(0, -1) : i.dtend;
        lines.push(`DTEND;${dtend.length === 8 ? 'VALUE=DATE' : 'TZID=' + this.tzid}:${dtend}`);
      }
      if (i.rrule) {
        lines.push(`RRULE:${i.rrule}`);
      }
      if (i.summary) {
        lines.push(`SUMMARY:${i.summary}`);
      }
      if (i.description) {
        lines.push(`DESCRIPTION:${i.description}`);
      }
      if (i.categories) {
        lines.push(`CATEGORIES:${i.categories}`);
      }

      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    // 对过长的行进行折叠
    const encoder = new TextEncoder();
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];

      if (encoder.encode(line).length > this.#maxLineLength) {
        lines.splice(i, 1, ...this.#foldLine(line));
      }
    }

    return lines.join('\r\n');
  }

  dateToDateTime(date: Date) {
    return dateToDateTime(date, this.tzid);
  }

  get hasChanged(): boolean {
    if (this.#hasChanged) return true;
    return this.items.some((v) => v.hasChanged);
  }

  set hasChanged(hasChanged: boolean) {
    this.#hasChanged = hasChanged;
  }

  /**
   * 请不要将此函数当作通用函数，此函数可能仅适用于本项目
   */
  static fromString(data: string): Vcalendar {
    const builder = new VcalendarBuilder();
    const items: Vevent[] = [];

    const lines = data.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);

    let inEvent = false;
    for (const i of lines) {
      if (inEvent) {
        const item = items.at(-1)!;
        if (i.startsWith('UID:')) {
          item.uid = i.slice('UID:'.length);
        } else if (i.startsWith('DTSTAMP:')) {
          item.dtstamp = i.slice('DTSTAMP:'.length);
        } else if (i.startsWith('DTSTART')) {
          item.dtstart = i.slice(i.indexOf(':') + 1);
        } else if (i.startsWith('DTEND')) {
          item.dtend = i.slice(i.indexOf(':') + 1);
        } else if (i.startsWith('RRULE:')) {
          item.rrule = i.slice('RRULE:'.length);
        } else if (i.startsWith('SUMMARY:')) {
          item.summary = i.slice('SUMMARY:'.length);
        } else if (i.startsWith('DESCRIPTION:')) {
          item.description = i.slice('DESCRIPTION:'.length);
        } else if (i.startsWith('CATEGORIES:')) {
          item.categories = i.slice('CATEGORIES:'.length);
        } else if (i === 'END:VEVENT') {
          inEvent = false;

          // 补齐必填值
          if (!item.uid) {
            item.uid = crypto.randomUUID();
            console.warn(`Not found uid in line ${lines.indexOf(i) + 1}, default to "${item.uid}".`);
          }
          if (!item.dtstamp) {
            item.dtstamp = dateToDateTime(new Date(), builder.tzid);
            console.warn(`Not found dtstamp in line ${lines.indexOf(i) + 1}, default to "${item.dtstamp}".`);
          }

          if (!item.dtstart) {
            throw new Error(`Not found dtstart in line ${lines.indexOf(i) + 1}`);
          }

          item.hasChanged = false;
        }
      } else {
        if (i.startsWith('VERSION:')) {
          builder.setVersion(i.slice('VERSION:'.length));
        } else if (i.startsWith('PRODID:')) {
          builder.setProdId(i.slice('PRODID:'.length));
        } else if (i.startsWith('NAME:')) {
          builder.setName(i.slice('NAME:'.length));
        } else if (i.startsWith('REFRESH-INTERVAL;VALUE=DURATION:')) {
          builder.setRefreshInterval(i.slice('REFRESH-INTERVAL;VALUE=DURATION:'.length));
        } else if (i.startsWith('CALSCALE:')) {
          builder.setCalScale(i.slice('CALSCALE:'.length));
        } else if (i.startsWith('TZID:')) {
          builder.setTzid(i.slice('TZID:'.length));
        } else if (i.startsWith('TZOFFSETTO:')) {
          builder.setTzoffset(i.slice('TZOFFSETTO:'.length));
        } else if (i === 'BEGIN:VEVENT') {
          inEvent = true;
          items.push(new Vevent(''));
        }
      }
    }

    builder.setItems(items);
    return builder.build();
  }

  #foldLine(line: string): string[] {
    const encoder = new TextEncoder();
    const lines: string[] = [];

    let buffer = '';
    let bufferLength = 0;

    for (const char of line) {
      const len = encoder.encode(char).length;

      if (bufferLength + len > this.#maxLineLength) {
        lines.push(buffer);

        buffer = ` ${char}`;
        bufferLength = 1 + len;
      } else {
        buffer += char;
        bufferLength += len;
      }
    }

    lines.push(buffer);
    return lines;
  }
}

class VcalendarBuilder {
  version?: string;
  prodId?: string;
  name?: string;
  refreshInterval?: string;
  calScale?: string;
  tzid?: string;
  tzoffset?: string;
  items: Vevent[] = [];

  setVersion(version: string) {
    this.version = version;
    return this;
  }
  setProdId(prodId: string) {
    this.prodId = prodId;
    return this;
  }
  setName(name: string) {
    this.name = name;
    return this;
  }
  setRefreshInterval(refreshInterval: string) {
    this.refreshInterval = refreshInterval;
    return this;
  }
  setCalScale(calScale: string) {
    this.calScale = calScale;
    return this;
  }
  setTzid(tzid: string) {
    this.tzid = tzid;
    return this;
  }
  setTzoffset(tzoffset: string) {
    this.tzoffset = tzoffset;
    return this;
  }
  setItems(items: Vevent[]) {
    this.items = items;
    return this;
  }
  build() {
    if (!this.version) throw new Error('version is required');
    if (!this.prodId) throw new Error('prodId is required');
    if (!this.name) throw new Error('name is required');
    if (!this.refreshInterval) throw new Error('refreshInterval is required');
    if (!this.calScale) throw new Error('calScale is required');
    if (!this.tzid) throw new Error('tzid is required');
    if (!this.tzoffset) throw new Error('tzoffset is required');
    if (!this.items) throw new Error('items is required');

    return new Vcalendar(
      this.version,
      this.prodId,
      this.name,
      this.refreshInterval,
      this.calScale,
      this.tzid,
      this.tzoffset,
      this.items,
    );
  }
}

class Vevent {
  uid: string;
  dtstamp?: string;
  #dtstart?: string;
  #dtend?: string;
  #rrule?: string;
  #summary?: string;
  #description?: string;
  #categories?: string;
  hasChanged: boolean = false;

  constructor(uid: string) {
    this.uid = uid;
  }

  get dtstart(): string {
    if (!this.#dtstart) throw new Error('Invaild dtstart');
    return this.#dtstart;
  }

  set dtstart(dtstart: string) {
    if (dtstart.endsWith('Z')) dtstart = dtstart.slice(0, -1);
    if (this.#dtstart !== dtstart) {
      this.#dtstart = dtstart;
      this.hasChanged = true;
    }
  }

  get dtend(): string | undefined {
    return this.#dtend;
  }

  set dtend(dtend: string | undefined) {
    if (dtend && dtend.endsWith('Z')) dtend = dtend.slice(0, -1);
    if (this.#dtend !== dtend) {
      this.#dtend = dtend;
      this.hasChanged = true;
    }
  }

  get rrule(): string | undefined {
    return this.#rrule;
  }

  set rrule(rrule: string | undefined) {
    if (this.#rrule !== rrule) {
      this.#rrule = rrule;
      this.hasChanged = true;
    }
  }

  get summary(): string | undefined {
    return this.#summary;
  }

  set summary(summary: string | undefined) {
    if (this.#summary !== summary) {
      this.#summary = summary;
      this.hasChanged = true;
    }
  }

  get description(): string | undefined {
    return this.#description;
  }

  set description(description: string | undefined) {
    if (description === '') description = void 0;

    if (this.#description !== description) {
      this.#description = description;
      this.hasChanged = true;
    }
  }

  get categories(): string | undefined {
    return this.#categories;
  }

  set categories(categories: string | undefined) {
    if (categories === '') categories = void 0;

    if (this.#categories !== categories) {
      this.#categories = categories;
      this.hasChanged = true;
    }
  }

  setCategoryList(categoryList: string[] | undefined) {
    this.categories = categoryList?.join(',');
  }
}

const timeout = (time: number) => new Promise((resolve) => setTimeout(resolve, time));

function dateToDateTime(date: Date, tzid: string = 'Etc/UTC') {
  const options = {
    timeZone: tzid,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  } as const;

  const temp = new Intl.DateTimeFormat('zh-CN', options).format(date);
  return temp.replaceAll('/', '').replace(' ', 'T').replaceAll(':', '') + 'Z';
}

function getFullYearByTimezone(date: Date, tzid: string = 'Etc/UTC'): number {
  const options = {
    timeZone: tzid,
    year: 'numeric',
  } as const;

  // "xxxx年"
  const temp = (new Intl.DateTimeFormat('zh-CN', options)).format(date);
  return Number(temp.slice(0, -1));
}

function getDateByTimezone(date: Date, tzid: string = 'Etc/UTC'): number {
  const options = {
    timeZone: tzid,
    day: 'numeric',
  } as const;

  // "[x]x日"
  const temp = (new Intl.DateTimeFormat('zh-CN', options)).format(date);
  return Number(temp.slice(0, -1));
}

function getMonthByTimezone(date: Date, tzid: string = 'Etc/UTC'): number {
  const options = {
    timeZone: tzid,
    month: 'numeric',
  } as const;

  // "[x]x月"
  const temp = (new Intl.DateTimeFormat('zh-CN', options)).format(date);
  return Number(temp.slice(0, -1));
}

class PathHelper {
  static readonly ROOT = join(Deno.cwd(), 'release');
  readonly moduleName: string;
  readonly icsPath: string;
  readonly jsonPath: string;

  constructor(moduleName: string) {
    this.moduleName = moduleName;
    this.icsPath = join(PathHelper.ROOT, moduleName + '.ics');
    this.jsonPath = join(PathHelper.ROOT, moduleName + '.json');
  }
}

/** 重试，当函数执行失败时，重试指定次数，依然失败则抛出最后一次的错误 */
function retry<T>(
  fn: () => Promise<T>,
  times: number = 3,
  retryCallback?: (error: unknown, retryCount: number) => void,
): Promise<T> {
  return fn().catch((e) => {
    if (times > 0) {
      retryCallback?.(e, times);
      return retry(fn, times - 1, retryCallback);
    }
    throw e;
  });
}

interface RetryWithBackoffOptions {
  // Retry
  maxRetryAttempt: number;
  logInitAttempt?: boolean;

  // Backoff
  baseDelayMs: number;
  maxDelayMs: number;

  // Callbacks
  onBackoff?: (err?: TypeError | RetryableHttpError) => void;
  onRetry?: (err?: TypeError | RetryableHttpError) => void;
}

const defaultHttpRetryWithBackoffOption: RetryWithBackoffOptions = {
  maxRetryAttempt: 3,
  baseDelayMs: 500,
  maxDelayMs: 5_000,
};

/**
 * Fetch with automatic retry-and-backoff on transient failures.
 *
 * Wraps {@link retryCall} around the standard `fetch` with default retry options.
 * Use this instead of `fetch` for any network call where a transient failure
 * is acceptable to retry.
 *
 * @param input - URL string, URL object, or Request (same as `fetch`)
 * @param init  - Request options (same as `fetch`)
 * @returns Resolves with a Response. Rejects only after all retries are exhausted
 *          or on a non-retryable condition.
 * @see retryCall for the retry policy
 * @see {@link defaultHttpRetryWithBackoffOption} for the default retry options
 */
function retryFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  return retryCall(() => fetch(input, init));
}

/**
 * Executes an HTTP request with retry-and-backoff logic.
 *
 * Retries on:
 * - Retryable HTTP status codes (5xx, 429) parsed via {@link RetryableHttpError}
 * - Retryable network errors (ECONNRESET, ETIMEDOUT, etc.) and AbortError
 *   classified by {@link isRetryableNetworkError}
 *
 * Does NOT retry on successful responses (2xx) or non-retryable errors.
 */
async function retryCall(
  fn: () => Promise<Response>,
  opt: RetryWithBackoffOptions = defaultHttpRetryWithBackoffOption,
): Promise<Response> {
  let lastErr: TypeError | RetryableHttpError | Error | null = null;
  // Up to 1 (initial) + opt.maxRetryAttempt (retries) attempts
  for (let i = 0; i <= opt.maxRetryAttempt; i++) {
    // i = 0 is the first try; i > 0 are retries
    const logStr = () => `${new Date().toISOString()} [${i}/${opt.maxRetryAttempt}]`;

    // Attempt
    try {
      if (i > 0 || opt.logInitAttempt) {
        console.log(`${logStr()} Attempt to action`);
      }
      const resp = await fn();
      const httpError = RetryableHttpError.parseHttpError(resp);
      if (!httpError) {
        return resp;
      }
      lastErr = httpError;
    } catch (err) {
      if (!isRetryableNetworkError(err)) {
        throw err;
      }
      lastErr = err;
    }

    // Backoff
    if (lastErr) {
      if (i >= opt.maxRetryAttempt) {
        // avoid delaying after last retry;
        break;
      }
      const delayMs = Math.min(opt.maxDelayMs, (2 ** i) * opt.baseDelayMs);
      console.error(`${logStr()} Request failed, backoff for ${delayMs}ms and retry: `, lastErr);
      opt.onBackoff?.(lastErr);
      await timeout(delayMs);
      opt.onRetry?.(lastErr);
    }
  }
  console.error(`All ${opt.maxRetryAttempt} retries exhausted, giving up:`, lastErr);
  throw lastErr;
}

export class RetryableHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly url: string,
  ) {
    super(`HTTP ${status} ${statusText} for ${url}`);
    this.name = 'HttpError';
  }

  static getRetryableStatusCode() {
    return [500, 502, 503, 504, 429];
  }

  static parseHttpError(resp: Response): RetryableHttpError | null {
    const retryable = new Set(RetryableHttpError.getRetryableStatusCode());
    return retryable.has(resp.status) ? new RetryableHttpError(resp.status, resp.statusText, resp.url) : null;
  }
}

function isRetryableNetworkError(err: unknown): err is TypeError {
  if (err instanceof DOMException && err.name === 'AbortError' || 'TimeoutError') {
    return true; // retryable — timeout is transient
  }

  if (!(err instanceof TypeError)) return false;

  const code = (err as any).cause?.code as string | undefined;
  if (!code) return false;

  const retryable = new Set([
    // TCP / connect
    'ECONNREFUSED', // service down / starting up
    'ETIMEDOUT', // handshake timeout
    'ECONNRESET', // peer reset mid-connection
    'ECONNABORTED', // local abort / timeout
    'EHOSTUNREACH', // no route to host
    'EAI_AGAIN', // DNS timeout

    // Undici (Node fetch)
    'UND_ERR_CONNECT_TIMEOUT', // TCP connect timeout
    'UND_ERR_HEADERS_TIMEOUT', // headers never arrived
    'UND_ERR_BODY_TIMEOUT', // body stream stalled
    'UND_ERR_SOCKET', // generic socket failure
  ]);

  return retryable.has(code);
}

/** 清理换行符 */
function cleanString(str: string) {
  return str.replaceAll('<br>', '').replaceAll('\n', '');
}

export {
  cleanString,
  defaultHttpRetryWithBackoffOption,
  getDateByTimezone,
  getFullYearByTimezone,
  getMonthByTimezone,
  PathHelper,
  retry,
  retryCall,
  retryFetch,
  type RetryWithBackoffOptions,
  timeout,
  Vcalendar,
  VcalendarBuilder,
  Vevent,
};
