import { EventType } from './type/EventType.ts';
import { load } from 'cheerio';
import { crc32 } from '@deno-library/crc32';


async function getAllEvents(): Promise<EventType[]> {
    // 因为米游社wiki活动详情页的数据参差不齐，所以这里用b站的
    const eventsRes = await fetch('https://wiki.biligame.com/ys/活动一览').then(res => res.text());
    // 因为时间区间经常有 "x.x版本结束" 和 "x.x版本更新后" 这种写法，所以这里要获取各个版本的更新时间
    const versionRes = await fetch('https://wiki.biligame.com/ys/版本历史').then(res => res.text());

    // 先把版本数据处理了
    const version$ = load(versionRes);
    const version: Record<string, { start: Date, end: Date }> = {};
    // 去掉表头
    version$('tbody tr').slice(1).each((_i, v) => {
        const key = version$(v).find('th').eq(0).text().replace('\n', '');
        const start = new Date(version$(v).find('td').eq(0).text().replace('\n', '') + ' UTC+0800');
        const end = new Date(start);
        end.setDate(end.getDate() + 42); // 6周

        version[key] = { start, end }
    });
    const handleDateStr = (dateStr: string) => {
        // "x.x版本结束"
        const match1 = /(\d+\.\d+)版本结束/.exec(dateStr);
        if (match1) {
            const key = match1[1];
            if (!(key in version)) throw new Error('Cannot find version: ' + key);
            return version[key].end;
        }

        // "x.x版本更新后"
        const match2 = /(\d+\.\d+)版本更新后/.exec(dateStr);
        if (match2) {
            const key = match2[1];
            if (!(key in version)) throw new Error('Cannot find version: ' + key);
            return version[key].start;
        }

        return new Date(dateStr + ' UTC+0800');
    }

    const events$ = load(eventsRes);
    const result: EventType[] = [];
    events$('#CardSelectTr tbody tr').slice(1).each((_i, v) => {
        const typeStr = events$(v).attr('data-param1')!;
        const types = typeStr.split(', ');
        if (types.some(v => ['特殊活动', '额外活动', '永久活动', '剧情活动', '探索活动', '七圣召唤', '回归活动'].includes(v))) {
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
