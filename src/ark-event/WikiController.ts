import { EventType } from './type/EventType.ts';
import { load } from 'cheerio';
import { crc32 } from '@deno-library/crc32';


async function getAllEvents(): Promise<EventType[]> {
    // prts 的数据太乱了，最终还是b站拯救了世界
    const res = await fetch('https://wiki.biligame.com/arknights/活动关卡').then(res => res.text());
    const $ = load(res);

    const result: EventType[] = [];
    // 这里使用选择器排除集成攻略和生息演算
    $('tbody:not(:has(tr:nth-child(2) th:only-child)) tr:nth-child(2n - 1):not(:first-child)').each((_i, v) => {
        const name = $(v).find('td').eq(0).text().trim();
        const timeStr = $(v).find('td').eq(1).text().trim();

        const [startStr, endStr] = timeStr.split(' - ');
        // 这里要将日替换成空格，用来应对这种没加空格的情况："2021年10月15日03:59"(SideStory「玛莉娅·临光」复刻)
        const startStr2 = startStr.replace('年', '/').replace('月', '/').replace('日', ' ');
        const endStr2 = endStr.replace('年', '/').replace('月', '/').replace('日', ' ');
        result.push({
            id: crc32(name),
            name,
            start: new Date(startStr2 + ' UTC+0800'),
            end: new Date(endStr2 + ' UTC+0800')
        });
    });
    return result;
}


export {
    getAllEvents
}
