import { EventType } from './type/EventType.ts';
import { crc32 } from '@deno-library/crc32';
import { retryWithBackoff } from '../BaseUtil.ts';

const EXPLICIT_DROP = new Set([
  '分类:有活动信息的页面',
  '分类:使用Tabber解析器标签的页面',
  '分类:使用DynamicPageList3解析器函数的页面',
  '分类:对原文有修正的页面',
  '分类:拥有大厅差分的活动',
  '分类:含有受损文件链接的页面',
  '分类:编辑中的页面',
]);

const CATEGORY_PREFIX = '分类:';

const categoryFilter = (category: string) => {
  return !EXPLICIT_DROP.has(category);
};

const categoryNameMapper = (raw: string) => {
  switch (raw) {
    case '分类:存在蚀刻章备注的活动':
      return '包含蚀刻章';
    default:
      return raw.startsWith(CATEGORY_PREFIX) ? raw.slice(CATEGORY_PREFIX.length) : raw;
  }
};

function getAllEvents(): Promise<EventType[]> {
  return retryWithBackoff(fetchAllEvents);
}

async function fetchAllEvents(): Promise<EventType[]> {
  // ~~prts 的数据太乱了，最终还是b站拯救了世界~~
  // 最后发现是我不会用，错怪prts了，我才是那个笨比 T T
  const eventsData = await fetch(
    'https://prts.wiki/api.php?action=ask&query=[[分类:有活动信息的页面]][[!分类:愚人节活动]]|?活动开始时间|?活动结束时间|?分类|?官网链接|limit=1000&format=json',
  ).then((res) => res.json()) as {
    query: {
      results: {
        [key: string]: {
          fulltext: string;
          printouts: {
            // 筛掉愚人节之后活动起止时间就没有为空的了
            '活动开始时间': [{
              // 秒
              timestamp: number;
            }];
            '活动结束时间': [{
              // 秒
              timestamp: number;
            }];
            // 一个 id，使用示例: `https://ak.hypergryph.com/news/${id}.html`
            // 主题好像都是空的
            '官网链接': [string];
            '分类': [{
              fulltext: string;
            }];
          };
        };
      };
    };
  };

  const result: EventType[] = [];
  for (const i of Object.values(eventsData.query.results)) {
    const ev: EventType = {
      id: crc32(i.fulltext),
      name: i.fulltext,
      start: new Date(i.printouts['活动开始时间'][0].timestamp * 1000),
      end: new Date(i.printouts['活动结束时间'][0].timestamp * 1000),
      categories: [
        ...i.printouts['分类'].map((x) => x.fulltext).filter(categoryFilter).map(categoryNameMapper),
      ],
    };
    const rawSiteId = i.printouts['官网链接'];
    if (rawSiteId && [...rawSiteId].length > 0) {
      ev.siteId = rawSiteId[0];
    }
    result.push(ev);
  }
  return result;
}

export { getAllEvents };
