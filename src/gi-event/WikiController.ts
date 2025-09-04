import { crc32 } from '@deno-library/crc32';
import { EventType } from './type/EventType.ts';


async function getAllEvents(): Promise<EventType[]> {
    // 411
    const eventsData = await fetch(encodeURI('https://wiki.biligame.com/ys/api.php?action=ask&query=[[分类:活动]]|?开始时间|?结束时间|?类型|?活动描述|?官方公告链接|limit=500&format=json')).then(res => res.json()) as {
        query: {
            results: {
                [key: string]: {
                    // fulltext = key
                    fulltext: string,
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
                        // 这里返回的数据使用 '<br/>' 换行，使用时记得替换
                        '活动描述': [string?],
                        '官方公告链接': [string?]
                    }
                }
            }
        }
    };
    console.log('deb', Object.values(eventsData.query.results).length);

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
        const types = i.printouts['类型'].length > 0 ? i.printouts['类型'].join(', ') : '';
        let desc = i.printouts['活动描述'].at(0) ?? '';
        desc = desc.replaceAll('\n', '\\n').replaceAll('<br>', '');

        if (types) {
            // 如果是网页活动，则尝试提供快捷入口
            if (types.includes('网页活动') && i.printouts['官方公告链接'].length > 0) {
                desc += '\\n\\n' + i.printouts['官方公告链接'][0];
            }
            // 显示类型
            desc += '\\n\\n' + i.printouts['类型'][0];
        }


        result.push({
            id: crc32(i.fulltext),
            name: i.fulltext,
            description: desc.trim(),
            start: new Date(i.printouts['开始时间'][0]!.timestamp * 1000),
            end: new Date(i.printouts['结束时间'][0]!.timestamp * 1000)
        });
    }
    return result;
}


export {
    getAllEvents
}
