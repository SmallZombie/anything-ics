import { EventType } from './type/EventType.ts';
import { crc32 } from '@deno-library/crc32';


async function getAllEvents(): Promise<EventType[]> {
    // ~~prts 的数据太乱了，最终还是b站拯救了世界~~
    // 最后发现是我不会用，错怪prts了，我才是那个笨比 T T
    const eventsData = await fetch('https://prts.wiki/api.php?action=ask&query=[[分类:有活动信息的页面]][[!分类:愚人节活动]]|?活动开始时间|?活动结束时间|?官网链接|limit=1000&format=json').then(res => res.json()) as {
        query: {
            results: {
                [key: string]: {
                    fulltext: string,
                    printouts: {
                        // 筛掉愚人节之后活动起止时间就没有为空的了
                        '活动开始时间': [{
                            // 秒
                            timestamp: number
                        }],
                        '活动结束时间': [{
                            // 秒
                            timestamp: number
                        }],
                        // 一个 id，使用示例: `https://ak.hypergryph.com/news/${id}.html`
                        // 主题好像都是空的
                        '官网链接': [number?]
                    }
                }
            }
        }
    }

    const result: EventType[] = [];
    for (const i of Object.values(eventsData.query.results)) {
        result.push({
            id: crc32(i.fulltext),
            name: i.fulltext,
            start: new Date(i.printouts['活动开始时间'][0].timestamp * 1000),
            end: new Date(i.printouts['活动结束时间'][0].timestamp * 1000)
        });
    }
    return result;
}


export {
    getAllEvents
}
