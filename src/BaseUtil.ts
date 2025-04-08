import { join } from '@std/path/join';


class Vcalendar {
    version: string;
    prodId: string;
    name: string;
    refreshInterval: string;
    calScale: string;
    tzid: string;
    tzoffset: string;
    items: Vevent[];
    #hasChanged: boolean = false;

    constructor(version: string, prodId: string, name: string, refreshInterval: string, calScale: string, tzid: string, tzoffset: string, items: Vevent[]) {
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
        lines.push('REFRESH-INTERVAL;VALUE=DURATION:' + this.refreshInterval)
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

            lines.push('END:VEVENT');
        }

        lines.push('END:VCALENDAR');
        return lines.join('\n');
    }

    dateToDateTime(date: Date) {
        return dateToDateTime(date, this.tzid);
    }

    get hasChanged(): boolean {
        if (this.#hasChanged) return true;
        return this.items.some(v => v.hasChanged);
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

        let inEvent = false;
        const lines = data.split(/\r?\n/);
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
                    items.push(new Vevent('', '', ''));
                }
            }
        }

        builder.setItems(items);
        return builder.build();
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

        return new Vcalendar(this.version, this.prodId, this.name, this.refreshInterval, this.calScale, this.tzid, this.tzoffset, this.items);
    }
}

class Vevent {
    uid: string;
    dtstamp: string;
    #dtstart: string;
    #dtend?: string;
    #rrule?: string;
    #summary?: string;
    #description?: string;
    hasChanged: boolean = false;

    constructor(uid: string, dtstamp: string, dtstart: string) {
        this.uid = uid;
        this.dtstamp = dtstamp;
        this.#dtstart = dtstart;
    }


    get dtstart(): string {
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
        if (this.#description !== description) {
            this.#description = description;
            this.hasChanged = true;
        }
    }
}

const timeout = (time: number) => new Promise(resolve => setTimeout(resolve, time));

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
        year: 'numeric'
    } as const;

    // "xxxx年"
    const temp = (new Intl.DateTimeFormat('zh-CN', options)).format(date);
    return Number(temp.slice(0, -1));
}

function getDateByTimezone(date: Date, tzid: string = 'Etc/UTC'): number {
    const options = {
        timeZone: tzid,
        day: 'numeric'
    } as const;

    // "[x]x日"
    const temp = (new Intl.DateTimeFormat('zh-CN', options)).format(date);
    return Number(temp.slice(0, -1));
}

function getMonthByTimezone(date: Date, tzid: string = 'Etc/UTC'): number {
    const options = {
        timeZone: tzid,
        month: 'numeric'
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
function retry<T>(fn: () => Promise<T>, times: number = 3, retryCallback?: (error: unknown, retryCount: number) => void): Promise<T> {
    return fn().catch(e => {
        if (times > 0) {
            retryCallback?.(e, times);
            return retry(fn, times - 1, retryCallback);
        }
        throw e;
    });
}


export {
    Vcalendar,
    VcalendarBuilder,
    Vevent,
    timeout,
    getFullYearByTimezone,
    getDateByTimezone,
    getMonthByTimezone,
    PathHelper,
    retry
}
