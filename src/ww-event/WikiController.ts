import { crc32 } from '@deno-library/crc32';
import { EventType } from './type/EventType.ts';


export async function getAllEvents(): Promise<EventType[]> {
    // 鸣潮官网的公告不更新了
    // 鸣潮官方wiki的活动持续时间全是 "x.x版本更新后~xxxx年xx月xx日"，用不了
    // gamekee 虽然数据很漂亮，但他东西不全
    // b站wiki的活动日历居然是手动更新的，这就意味着每次更新都可能移除过时的活动
    // 没办法了先用b站吧，直到有更好的替代，我还是希望能保留旧的活动即便已经结束了
    const resp = await fetch('https://wiki.biligame.com/wutheringwaves/index.php?title=首页/活动日历&action=raw').then(res => res.text());

    const lines = resp.split('\n');
    const result: EventType[] = [];
    for (let line of lines) {
        if (!line.startsWith('{{')) continue;
        line = line.substring(0, line.length - 2);

        const [, name, startTime, endTime] = line.split('|');

        // 跳过常驻
        if (!endTime) continue;

        result.push({
            id: crc32(name),
            name,
            start: new Date(startTime + ' UTC+0800'),
            end: new Date(endTime + ' UTC+0800'),
        });
    }

    return result;
}
