import { EventType } from './type/EventType.ts';
import { load } from 'cheerio';
import { crc32 } from '@deno-library/crc32';
import { timeout } from '../BaseUtil.ts';
import { EventDetailType } from './type/EventDetailType.ts';
import { CNEventType } from './type/CNEventType.ts';
import { ServerEnum } from './enum/ServerEnum.ts';


async function getGLAllEvents(): Promise<EventType[]> {
    const res = await fetch('https://bluearchive.wiki/wiki/Events').then(res => res.text());
    // 有时候这个 Grafana 有可能会挂掉然后返回一个错误页，这个页面主体内容大致是这样的：
    /*
        <main>
          <h1>If you're seeing this Grafana has failed to load its application files</h1>
          <ol class="preloader__error-list">
            <li>This could be caused by your reverse proxy settings.</li>
            <li>If you host grafana under a subpath make sure your <code>grafana.ini</code> <code>root_url</code> setting
              includes subpath. If not using a reverse proxy make sure to set <code>serve_from_sub_path</code> to true.</li>
            <li>If you have a local dev build make sure you build frontend using: <code>yarn start</code>, or
              <code>yarn build</code>.</li>
            <li>Sometimes restarting <code>grafana-server</code> can help.</li>
            <li>Check if you are using a non-supported browser. For more information, refer to the list of
              <a href="https://grafana.com/docs/grafana/latest/installation/requirements/#supported-web-browsers">
                supported browsers </a
              >.</li>
          </ol>
        </main>
    */
    // 这里通过 title 检测就可以
    const $ = load(res);
    if ($('title').text() === 'Grafana') {
        throw new Error('Grafana failed to load error');
    }

    const result: EventType[] = [];
    $('#tabber-tabpanel-Global_version-0 table tbody tr').slice(1).each((_i, el) => {
        const name = $(el).find('td').eq(0).text().trim();
        // 如果是返场的话后面会被加上 "/Rerun"
        const slug = $(el).find('td a').first().attr('title')!.replaceAll(' ', '_');
        const desc = $(el).find('td').eq(3).text().trim();
        // 这里因为存在相同名称但不同章节的情况，它们指向的页面是一样的，
        // 所以这里还要加上一个后缀混入 id 防止重复，这里就选择了 startTime，
        // 但这个 string 在极端情况下可能会出现问题，比如一开始填错然后修改等等情况，
        // 这会造成意外的 id 问题，从而导致先前错误的日程无法被更新或删除，
        // 所以从本版本开始，增加了去除无效数据的部分
        const startStr = $(el).find('td').eq(1).text().trim();
        result.push({
            id: crc32(slug + startStr),
            slug,
            feature: startStr,
            name,
            description: desc ? desc : void 0
        });
    });

    if (result.length === 0) {
        throw new Error('result length is 0: ' + res);
    }
    return result;
}

/** 基本同上 */
async function getJPAllEvents(): Promise<EventType[]> {
    const res = await fetch('https://bluearchive.wiki/wiki/Events').then(res => res.text());
    const $ = load(res);

    if ($('title').text() === 'Grafana') {
        throw new Error('Grafana failed to load error');
    }

    const result: EventType[] = [];
    $('#tabber-tabpanel-Japanese_version-0 table tbody tr').slice(1).each((_i, el) => {
        const name = $(el).find('td').eq(0).text().trim();
        const slug = $(el).find('td a').first().attr('title')!.replaceAll(' ', '_');
        const desc = $(el).find('td').eq(3).text().trim();
        const startStr = $(el).find('td').eq(2).text().trim();
        result.push({
            id: crc32(slug + startStr),
            slug,
            feature: startStr,
            name,
            description: desc ? desc : void 0
        });
    });
    return result;
}

async function getEventDetail(server: ServerEnum, slug: string, feature: string): Promise<EventDetailType> {
    if (server === ServerEnum.CN) {
        throw new Error('CN Server does not support this method');
    }

    const res = await fetch('https://bluearchive.wiki/wiki/' + slug).then(res => res.text());
    const $ = load(res);

    if ($('title').text() === 'Grafana') {
        throw new Error('Grafana failed to load error');
    }

    // 先判断该页面下是否存在多 Session or Part
    const hasTabber = $('h2:has(#Schedule) + div#tabber-0').length > 0;
    let timeStr = null;
    const idSelector = server === ServerEnum.GL ? '#Global_Version' : '#Japanese_Version';
    if (hasTabber) {
        const [year, month, day] = feature.split('-');
        const processedFeature = `${month}/${day}/${year}`;
        $(`#tabber-0 section article h3:has(${idSelector}) + table tr`).each((_i, el) => {
            const temp = $(el).find('td').text().trim();
            if ($(el).find('th').text().trim() === 'Event period' && temp.startsWith(processedFeature)) {
                timeStr = temp;
                return false;
            }
        });

        if (!timeStr) {
            throw new Error('Cannot find Event period');
        }
    } else {
        timeStr = $(`h3:has(${idSelector}) + table tbody tr:has(th:contains("Event period")) td`).text().trim();
    }

    const [startStr, endStr] = timeStr.split(' — ');
    // 这里是纽约时间
    return {
        start: new Date(startStr + ' UTC+0900'),
        end: new Date(endStr + '  UTC+0900')
    }
}

async function getCNAllEvents(): Promise<CNEventType[]> {
    const result: CNEventType[] = [];
    // 时间戳从本月开始
    const timestamp = new Date();
    timestamp.setUTCHours(0, 0, 0, 0);
    timestamp.setUTCDate(1);

    while (true) {
        const res = await fetch(`https://www.gamekee.com/v1/activity/query?active_at=${timestamp.getTime() / 1000}`, {
            headers: {
                'game-alias': 'ba'
            }
        }).then(res => res.json()) as {
            data: {
                id: number;
                title: string;
                // 时间戳 (秒)
                begin_at: number;
                end_at: number;
                pub_area: '国际服' | '日服' | '国服';
            }[];
        };
        if (!res.data.length) break;

        res.data.filter(v => {
            if (v.pub_area !== '国服') return false;
            if (v.title.includes('卡池')) return false;
            return true;
        }).forEach(v => {
            result.push({
                id: v.id.toString(),
                name: v.title,
                start: new Date(v.begin_at * 1000),
                end: new Date(v.end_at * 1000),
                slug: '',
                feature: ''
            });
        });

        // 向前一月
        timestamp.setMonth(timestamp.getMonth() - 1);

        await timeout(200);
    }

    return result;
}


export {
    getGLAllEvents,
    getJPAllEvents,
    getEventDetail,
    getCNAllEvents
}
