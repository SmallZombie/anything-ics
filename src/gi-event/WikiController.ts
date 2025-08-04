import { EventType } from './type/EventType.ts';
import { load } from 'cheerio';
import { crc32 } from '@deno-library/crc32';


async function getAllEvents(): Promise<EventType[]> {
    // 因为米游社wiki活动详情页的数据参差不齐，所以这里用b站的
    const eventsRes = await fetch('https://wiki.biligame.com/ys/api.php?format=json&action=parse&text=%7B%7Cid%3D%22CardSelectTr%22%20class%3D%22CardSelect%20wikitable%20sortable%20col-fold%22%20style%3D%22width%3A100%25%3Btext-align%3Acenter%22%0A%7C-id%3D%22CardSelectTabHeader%22%0A!%20style%3D%22width%3A20%25%22%20%7C%20%E6%B4%BB%E5%8A%A8%E6%97%B6%E9%97%B4%0A!%20%20%7C%20%E5%9B%BE%0A!%20style%3D%22width%3A20%25%22%20class%3D%22hidden-xs%22%20%7C%20%E5%90%8D%E7%A7%B0%0A!%20style%3D%22width%3A10%25%22%20class%3D%22hidden-xs%22%20%7C%20%E7%B1%BB%E5%9E%8B%0A!%20class%3D%22hidden-xs%22%20%7C%20%E6%89%80%E5%B1%9E%E7%89%88%E6%9C%AC%0A!%20class%3D%22hidden-xs%22%20%7C%20%E6%B4%BB%E5%8A%A8%E5%A5%96%E5%8A%B1%0A%7C-%7B%7B%23ask%3A%5B%5B%E5%88%86%E7%B1%BB%3A%E6%B4%BB%E5%8A%A8%5D%5D%7C%3F%E5%90%8D%E7%A7%B0%7C%3F%E5%BC%80%E5%A7%8B%E6%8F%8F%E8%BF%B0%7C%3F%E7%BB%93%E6%9D%9F%E6%8F%8F%E8%BF%B0%7C%3F%E7%B1%BB%E5%9E%8B%7C%3F%E6%89%80%E5%B1%9E%E7%89%88%E6%9C%AC%7C%3F%E6%B4%BB%E5%8A%A8%E5%A5%96%E5%8A%B1%7Csort%3D%E5%BC%80%E5%A7%8B%E6%97%B6%E9%97%B4%7Ctemplate%3D%E6%B4%BB%E5%8A%A8%E4%B8%80%E8%A7%88%2F%E8%A1%8C%7Cheaders%3Dhide%7Cformat%3Dtemplate%7Corder%3Ddesc%7Clink%3Dnone%7Cnamed%20args%3D1%7Climit%3D0721%7Coffset%3D0%7D%7D%0A%7C%7D&contentmodel=wikitext').then(res => res.json()) as {
        parse: {
            text: {
                '*': string
            }
        }
    }

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

    const events$ = load(eventsRes.parse.text['*']);
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
