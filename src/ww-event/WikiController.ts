import { EventType } from './type/EventType.ts';


export async function getAllEvents(): Promise<EventType[]> {
    const verResp = await fetch('https://static-cloudflare-ww.kuro.wiki/wiki.config.json').then(res => res.json()) as {
        resVer: string
    }
    const eventResp = await fetch(`https://static-cloudflare-ww.kuro.wiki/data/${verResp.resVer}/zh-Hans/activities.json`).then(res => res.json()) as {
        data: {
            schedule: {
                id: number
                title: string
                desc: string
                // [0]=start_at, [1]=end_at
                // 单位毫秒
                time?: [number, number]
            }[]
        }
    }

    const result: EventType[] = [];
    for (const i of eventResp.data.schedule) {
        // 跳过常驻活动
        if (!i.time) continue;
        // 持续时间超过一年也视为常驻
        if (i.time[1] - i.time[0] > 31536000000) continue;

        result.push({
            id: i.id,
            name: i.title,
            description: i.desc,
            start: new Date(i.time[0]),
            end: new Date(i.time[1])
        });
    }

    return result;
}
