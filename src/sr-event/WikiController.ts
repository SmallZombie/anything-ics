import { EventType } from './type/EventType.ts';
import { load } from 'cheerio';
import { crc32 } from '@deno-library/crc32';


async function getAllEvents(): Promise<EventType[]> {
    // 米游社wiki的活动一览页更新居然比b站还慢
    const eventsRes = await fetch('https://wiki.biligame.com/sr/活动一览').then(res => res.text());
    // 因为时间区间会有 "x.x版本更新后"、"x.x版本结束前"、"x.x版本结束" 和 "正式开服后" 这种写法，所以这里要获取各个版本的更新时间
    const versionRes = await fetch('https://wiki.biligame.com/sr/版本新增内容').then(res => res.text());

    // 先把版本数据处理了
    const version$ = load(versionRes);
    const version: Record<string, { start: Date, end: Date }> = {};
    // 去掉表头
    version$('tbody:has(tr:first-child th:nth-child(10)) tr:not(:first-child)').each((_i, v) => {
        const key = version$(v).find('th').eq(0).text().replace('\n', '');
        const start = new Date(version$(v).find('td').eq(0).text().replace('\n', '') + ' UTC+0800');
        const end = new Date(start);
        end.setDate(end.getDate() + 42); // 6周

        version[key] = { start, end }
    });
    const handleDateStr = (dateStr: string) => {
        // "x.x版本更新后"
        const match1 = /(\d+\.\d+)版本更新后/.exec(dateStr);
        if (match1) {
            const key = match1[1];
            if (!(key in version)) throw new Error('Cannot find version: ' + key);
            return version[key].start;
        }

        // "x.x版本结束前"
        const match2 = /(\d+\.\d+)版本结束前/.exec(dateStr);
        if (match2) {
            const key = match2[1];

            if (key in version) return version[key].end;

            // 这里加个兜底，因为有的活动结束时间远超 wiki 中的最新版本
            // 一个粗略的解决方法：返回一个本月底的日期，直到版本 wiki 更新或下个月
            const temp = new Date();
            temp.setUTCMonth(temp.getUTCMonth() + 1);
            temp.setUTCDate(0);
            temp.setUTCHours(0);
            temp.setUTCMinutes(0);
            temp.setUTCSeconds(0);
            temp.setUTCMilliseconds(0);
            return temp;
        }

        // "x.x版本结束"
        const match3 = /(\d+\.\d+)版本结束/.exec(dateStr);
        if (match3) {
            const key = match3[1];
            if (!(key in version)) throw new Error('Cannot find version: ' + key);
            return version[key].end;
        }

        // "正式开服后"
        const match4 = /正式开服后/.exec(dateStr);
        if (match4) {
            return new Date('2023-06-05T19:59:00.000Z');
        }

        return new Date(dateStr + ' UTC+0800');
    }

    const events$ = load(eventsRes);
    const result: EventType[] = [];
    events$('#CardSelectTr tbody tr').slice(1).each((_i, v) => {
        const typeStr = events$(v).attr('data-param1')!;
        const types = typeStr.split(', ');
        if (types.some(v => ['特殊活动', '永久活动'].includes(v))) {
            return;
        }

        const timeStr = events$(v).find('td').eq(0).text().replace('\n', '');
        const [startStr, endStr] = timeStr.split('~');
        result.push({
            id: crc32(events$(v).find('td').eq(1).text().replace('\n', '')),
            name: events$(v).find('td').eq(2).text().replace('\n', ''),
            description: typeStr,
            start: handleDateStr(startStr),
            end: handleDateStr(endStr)
        });
    });
    return result;
}


export {
    getAllEvents
}
