import { EventType } from './type/EventType.ts';


async function getAllEvents(): Promise<EventType[]> {
    // 因为米游社wiki活动详情页的数据参差不齐，所以这里用b站的
    const eventsRes = await fetch('https://www.gamekee.com/v1/activity/page-list?importance=0&sort=-1&keyword=&limit=0721&page_no=1&serverId=21&status=0', {
        headers: {
            'game-alias': 'mc'
        }
    }).then(res => res.json()) as {
        data: {
            id: number,
            title: string,
            description: string,
            begin_at: number, // 1749697200
            end_at: number // 1753300740
        }[]
    }

    const filterdEvents = eventsRes.data.filter(v => ![
        4597, // 【往期】查看往期活动
        5417, // 「弗洛游戏」公司创立投递礼
        5378, // 鸣潮×TheGreenParty新品首发
    ].includes(v.id));
    const result: EventType[] = [];
    for (const i of filterdEvents) {
        result.push({
            id: i.id,
            name: i.title,
            description: i.description.replaceAll('﻿', '').replaceAll('\n', ''),
            start: new Date(i.begin_at * 1000),
            end: new Date(i.end_at * 1000)
        });
    }

    return result;
}


export {
    getAllEvents
}
