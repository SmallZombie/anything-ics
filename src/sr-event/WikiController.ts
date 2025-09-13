import { cleanString } from '../BaseUtil.ts';
import { EventType } from './type/EventType.ts';
import { crc32 } from '@deno-library/crc32';


async function getAllEvents(): Promise<EventType[]> {
    // 米游社wiki的活动一览页更新居然比b站还慢
    const eventsData = await fetch('https://wiki.biligame.com/sr/api.php?action=ask&query=[[分类:活动]][[!活动需要内容]][[类型::!永久活动]][[开始时间::%2B]]|?开始时间|?结束时间|?类型|?TAG|?活动描述|?官方公告链接|limit=1000&format=json').then(res => res.json()) as {
        query: {
            results: {
                [key: string]: {
                    fulltext: string,
                    fullurl: string,
                    printouts: {
                        // 2024/04/26 12:00
                        '开始时间': [string],
                        '结束时间': [string?],
                        '类型': string[],
                        // 该数组永远不为空，即使在没有 tag 的情况下，数组里也会留有一个 '无'
                        'TAG': string[],
                        '活动描述': [string?],
                        '官方公告链接': [string?]
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
        const tags = [
            ...i.printouts['类型'],
            ...i.printouts['TAG'].filter(v => v !== '无')
        ];
        if (tags.length > 0) {
            desc.push(tags.join(','));
        }

        const startDate = new Date(i.printouts['开始时间'][0] + ' UTC+0800');
        const endDate = (() => {
            if (i.printouts['结束时间'].length > 0) {
                return new Date(i.printouts['结束时间'][0] + ' UTC+0800')
            } else {
                // 兜底方案，暂时缺失结束时间时就将其设为开始时间的三天后
                const temp = new Date(startDate.getTime());
                temp.setDate(temp.getDate() + 3);
                return temp;
            }
        })()

        result.push({
            id: crc32(i.fulltext),
            name: i.fulltext,
            description: desc.length > 0 ? desc.join('\\n\\n') : void 0,
            start: startDate,
            end: endDate
        });
    }
    return result;
}


export {
    getAllEvents
}
