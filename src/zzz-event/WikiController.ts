import { EventType } from './type/EventType.ts';
import { load } from 'cheerio';
import { crc32 } from '@deno-library/crc32';


type VersionType = {
    start: Date;
    end: Date;
}

async function getAllEvents(): Promise<EventType[]> {
    const eventsRes = await fetch('https://wiki.biligame.com/zzz/活动一览').then(res => res.text());
    const versions = await getAllVersions();
    const handleDateStr = (dateStr: string) => {
        // "x.x版本更新后"
        const match1 = /(\d+\.\d+)版本更新后/.exec(dateStr);
        if (match1) {
            const key = match1[1];
            if (!(key in versions)) throw new Error('Cannot find version: ' + key);
            return versions[key].start;
        }

        // "公测开启后"
        const match4 = /公测开启后/.exec(dateStr);
        if (match4) {
            return new Date('2024-07-04T02:00:00.000Z');
        }

        return new Date(dateStr + ' UTC+0800');
    }

    const events$ = load(eventsRes);
    const result: EventType[] = [];
    events$('#CardSelectTr tbody tr').slice(1).each((_i, v) => {
        const typeStr = events$(v).attr('data-param1')!;
        const types = typeStr.split(', ');
        if (types.some(v => ['特殊活动', '专题放映', '永久活动'].includes(v))) {
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

async function getAllVersions(): Promise<{ [key: string]: VersionType }> {
    const result: { [key: string]: VersionType } = {};
    let pn = 1;

    while (true) {
        const res = await fetch(`https://api-takumi-static.mihoyo.com/content_v2_user/app/706fd13a87294881/getContentList?iChanId=279&iPage=${pn}&iPageSize=100&sLangKey=zh-cn`).then(res => res.json()) as {
            data: {
                list: {
                    sTitle: string;
                    dtStartTime: string;
                }[];
            };
        };
        pn++;

        if (!res.data.list.length) break;
        for (const i of res.data.list) {
            // "x.x版本「xxxx」更新"
            const match = /(\d+\.\d+)版本「(.*)」更新/.exec(i.sTitle);
            if (!match) continue;

            const key = match[1];
            const start = new Date(i.dtStartTime + ' UTC+0800');
            const end = new Date(start);
            end.setDate(end.getDate() + 42); // 6周

            result[key] = { start, end };
        }
    }

    return result;
}


export {
    getAllEvents
}
