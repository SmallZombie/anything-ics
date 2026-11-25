import { EventType } from './type/EventType.ts';
import { parse } from 'lossless-json';
import { retryFetch } from '../BaseUtil.ts';

async function getAllEvents(): Promise<EventType[]> {
  // 获取最新版本
  const versionResult = await retryFetch(
    `https://data.akedata.wiki/manifest.json?t=${new Date().getTime()}`,
    { signal: AbortSignal.timeout(30_000) },
  ).then((res) => res.json()) as {
    latest: string;
  };
  const latestGameVersion = versionResult.latest.split('@')[0];
  const latestHotfixVersion = versionResult.latest.split('@')[1];

  // 获取活动表
  const eventTableResult = await retryFetch(
    `https://data.akedata.wiki/public/${latestGameVersion}/${latestHotfixVersion}/TableCfg/ActivityTable.json`,
    { signal: AbortSignal.timeout(30_000) },
  ).then((res) => res.text());
  const eventTableData = parse(eventTableResult) as {
    [id: string]: {
      name: {
        id: bigint;
      };
      desc: {
        id: bigint;
      };
      timeId: string;
      tagIds?: string[];
    };
  };

  // 获取标签（分类）表
  const eventTagTableResult = await retryFetch(
    `https://data.akedata.wiki/public/${latestGameVersion}/${latestHotfixVersion}/TableCfg/ActivityTagTable.json`,
    { signal: AbortSignal.timeout(30_000) },
  ).then(async (res) => await res.text());
  const eventTagTable = parse(eventTagTableResult) as {
    [id: string]: {
      name: {
        id: bigint; // i18n key
      };
    };
  };

  // 获取时间表
  const timeTableResult = await retryFetch(
    `https://data.akedata.wiki/public/${latestGameVersion}/${latestHotfixVersion}/TableCfg/TimeRangeTable.json`,
    { signal: AbortSignal.timeout(30_000) },
  ).then((res) => res.json()) as {
    [id: string]: {
      timeRangeList: [
        // 2027/7/1 4:00:00
        // 总是存在三个一模一样的对象，暂时不明白啥意思
        { openTime: string; closeTime: string | '' },
        { openTime: string; closeTime: string | '' },
        { openTime: string; closeTime: string | '' },
      ];
    };
  };

  // 获取本地化文件
  const i18nResult = await retryFetch(
    `https://data.akedata.wiki/public/${latestGameVersion}/${latestHotfixVersion}/TableCfg/I18nTextTable_CN.json`,
    { signal: AbortSignal.timeout(30_000) },
  ).then((res) => res.json()) as {
    [key: string]: string;
  };

  const events: EventType[] = [];
  for (const key of Object.keys(eventTableData)) {
    const value = eventTableData[key];

    const name = i18nResult[value.name.id.toString()];
    if (!name) continue;

    let desc = i18nResult[value.desc.id.toString()];
    if (desc) {
      desc = desc.replace(/<[^>]*>/g, '').replace(/\r?\n/g, '\\n');
    }

    const timeRange = timeTableResult[value.timeId];
    if (!timeRange) continue;

    const openTime = timeRange.timeRangeList[0].openTime;
    const closeTime = timeRange.timeRangeList[0].closeTime;
    if (!openTime || !closeTime) continue;

    const startTime = new Date(`${openTime} UTC+0800`);
    const endTime = new Date(`${closeTime} UTC+0800`);

    const categories = value.tagIds?.flatMap((tagId) => {
      const tagEntry = eventTagTable[tagId];
      if (!tagEntry) {
        return [];
      }
      const res = i18nResult[tagEntry.name.id.toString()];
      return res ? [res] : [];
    });

    events.push({
      id: key,
      name: name,
      description: desc,
      start: startTime,
      end: endTime,
      categories,
    });
  }

  return events;
}

export { getAllEvents };
