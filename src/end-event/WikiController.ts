import { EventType } from './type/EventType.ts';
import { parse } from 'lossless-json';


async function getAllEvents(): Promise<EventType[]> {
    // 获取最新版本
    const versionResult = await fetch(`https://data.akedata.wiki/manifest.json?t=${new Date().getTime()}`).then(res => res.json()) as {
        latest: string;
    }
    const latestGameVersion = versionResult.latest.split('@')[0];
    const latestHotfixVersion = versionResult.latest.split('@')[1];

    // 获取活动表
    const eventTableResult = await fetch(`https://data.akedata.wiki/public/${latestGameVersion}/${latestHotfixVersion}/TableCfg/ActivityTable.json`).then(res => res.text());
    const eventTableData = parse(eventTableResult) as {
        [id: string]: {
            name: {
                id: bigint;
            };
            desc: {
                id: bigint;
            };
            timeId: string;
        }
    }

    // 获取时间表
    const timeTableResult = await fetch(`https://data.akedata.wiki/public/${latestGameVersion}/${latestHotfixVersion}/TableCfg/TimeRangeTable.json`).then(res => res.json()) as {
        [id: string]: {
            timeRangeList: [
                // 2027/7/1 4:00:00
                // 总是存在三个一模一样的对象，暂时不明白啥意思
                { openTime: string; closeTime: string | ''; },
                { openTime: string; closeTime: string | ''; },
                { openTime: string; closeTime: string | ''; },
            ];
        }
    }

    // 获取本地化文件
    const i18nResult = await fetch(`https://data.akedata.wiki/public/${latestGameVersion}/${latestHotfixVersion}/TableCfg/I18nTextTable_CN.json`).then(res => res.json()) as {
        [key: string]: string,
    }

    const events: EventType[] = [];
    for (const key of Object.keys(eventTableData)) {
        const value = eventTableData[key];

        const name = i18nResult[value.name.id.toString()];
        if (!name) continue;

        let desc = i18nResult[value.desc.id.toString()];
        if (desc) {
            desc = desc.replace(/<[^>]*>/g, '');
        }

        const timeRange = timeTableResult[value.timeId];
        if (!timeRange) continue;

        const openTime = timeRange.timeRangeList[0].openTime;
        const closeTime = timeRange.timeRangeList[0].closeTime;
        if (!openTime || !closeTime) continue;

        const startTime = new Date(`${openTime} UTC+0800`);
        const endTime = new Date(`${closeTime} UTC+0800`);

        events.push({
            id: key,
            name: name,
            description: desc,
            start: startTime,
            end: endTime,
        });
    }

    return events;
}


export {
    getAllEvents
}
