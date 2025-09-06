import { cleanString } from '../BaseUtil.ts';
import { EventType } from './type/EventType.ts';
import { crc32 } from '@deno-library/crc32';


async function getAllEvents(): Promise<EventType[]> {
    const eventsData = await fetch('https://wiki.biligame.com/zzz/api.php?action=ask&query=[[分类:活动]][[类型::!永久活动]]|?开始时间|?结束时间|?活动描述|?官方公告链接|?类型|?TAG|limit=1000&format=json').then(res => res.json()) as {
        query: {
            results: {
                [key: string]: {
                    fulltext: string,
                    fullurl: string,
                    printouts: {
                        // 2024/12/06 20:30
                        '开始时间': [string],
                        // 2024/12/17 23:59
                        '结束时间': [string],
                        '活动描述': [string?],
                        '官方公告链接': [string?],
                        '类型': string[],
                        'TAG': string[]
                    }
                }
            }
        }
    }

    const result: EventType[] = [];
    for (const i of Object.values(eventsData.query.results)) {
        const desc: string[] = [];
        if (i.printouts['活动描述'].length > 0) {
            desc.push(cleanString(i.printouts['活动描述'][0]!));
        }
        if (i.printouts['官方公告链接'].length > 0) {
            desc.push(cleanString(i.printouts['官方公告链接'][0]!));
        } else {
            desc.push(i.fullurl);
        }
        const tags = [...i.printouts['类型'], ...i.printouts['TAG']];
        if (tags.length > 0) {
            desc.push(tags.join(','));
        }

        result.push({
            id: crc32(i.fulltext),
            name: i.fulltext,
            description: desc.join('\\n\\n'),
            start: new Date(i.printouts['开始时间'][0] + ' UTC+0800'),
            end: new Date(i.printouts['结束时间'][0] + ' UTC+0800')
        })
    }
    return result;
}


export {
    getAllEvents
}
