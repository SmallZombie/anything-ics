import { crc32 } from '@deno-library/crc32';
import { EventType } from './type/EventType.ts';


async function getAllEvents(): Promise<EventType[]> {
    const eventsData = await fetch('https://wiki.biligame.com/ys/api.php?action=ask&query=[[分类:活动]]|?开始时间|?结束时间|?类型|?活动描述|?官方公告链接|limit=500&format=json').then(res => res.json()) as {
        query: {
            results: {
                [key: string]: {
                    // fulltext = key
                    fulltext: string,
                    fullurl: string,
                    printouts: {
                        '开始时间': [{
                            // 单位秒
                            timestamp: number
                        }?],
                        '结束时间': [{
                            // 单位秒
                            timestamp: number
                        }?],
                        '类型': string[],
                        '活动描述': [string?],
                        '官方公告链接': [string?]
                    }
                }
            }
        }
    }

    const result: EventType[] = [];
    const filterdEvents = Object.values(eventsData.query.results).filter(v => {
        if (v.printouts['开始时间'].length === 0 || v.printouts['结束时间'].length === 0) {
            return false;
        }
        if (v.printouts['类型'].includes('永久活动')) {
            return false;
        }
        if (v.printouts['类型'].includes('千音雅集')) {
            return false;
        }

        return true;
    });
    for (const i of filterdEvents) {
        const desc: string[] = [];
        if (i.printouts['活动描述'].length > 0) {
            desc.push(i.printouts['活动描述'][0]!.replaceAll('<br>', '').replaceAll('\n', ''));
        }
        if (i.printouts['官方公告链接'].length > 0) {
            desc.push(i.printouts['官方公告链接'][0]!);
        } else {
            desc.push(i.fullurl);
        }
        if (i.printouts['类型'].length > 0) {
            desc.push(i.printouts['类型'].join(','));
        }

        result.push({
            id: crc32(i.fulltext),
            name: i.fulltext,
            description: desc.join('\\n\\n'),
            start: new Date(i.printouts['开始时间'][0]!.timestamp * 1000),
            end: new Date(i.printouts['结束时间'][0]!.timestamp * 1000)
        });
    }
    return result;
}


export {
    getAllEvents
}
