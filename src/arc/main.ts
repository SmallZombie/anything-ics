import {
  getDateByTimezone,
  getFullYearByTimezone,
  getMonthByTimezone,
  PathHelper,
  Vcalendar,
  VcalendarBuilder,
  Vevent,
} from '../BaseUtil.ts';
import { existsSync } from '@std/fs/exists';

const TZID = 'Asia/Shanghai';

interface EventJson {
  id: string;
  name: string;
  start: string;
  end: string;
  description?: string;
  categories?: string[];
}

interface ArcItem {
  uid: string;
  date: string;
  summary: string;
  description?: string;
  categories?: string;
}

function dateToDateString(iso: string): string {
  const d = new Date(iso);
  const year = getFullYearByTimezone(d, TZID);
  const month = String(getMonthByTimezone(d, TZID)).padStart(2, '0');
  const day = String(getDateByTimezone(d, TZID)).padStart(2, '0');
  return `${year}${month}${day}`;
}

function getArcItems(events: EventJson[], moduleName: string): ArcItem[] {
  const items: ArcItem[] = [];

  for (const event of events) {
    if (event.start === event.end) {
      items.push(newArcItem(moduleName, event));
    } else {
      items.push(newStartArcItem(moduleName, event));
      items.push(newEndArcItem(moduleName, event));
    }
  }

  return items;
}

function newArcItem(moduleName: string, event: EventJson): ArcItem {
  const item: ArcItem = {
    uid: `${moduleName}-arc-${event.id}`,
    date: dateToDateString(event.start),
    summary: event.name,
    description: event.description,
  };
  if (event.categories && event.categories.length) {
    item.categories = event.categories.join(',');
  }
  return item;
}
function newStartArcItem(moduleName: string, event: EventJson): ArcItem {
  const item: ArcItem = {
    uid: `${moduleName}-arc-${event.id}-start`,
    date: dateToDateString(event.start),
    summary: `[开始] ${event.name}`,
    description: event.description,
  };
  if (event.categories && event.categories.length) {
    item.categories = event.categories.join(',');
  }
  return item;
}
function newEndArcItem(moduleName: string, event: EventJson): ArcItem {
  const item: ArcItem = {
    uid: `${moduleName}-arc-${event.id}-end`,
    date: dateToDateString(event.end),
    summary: `[结束] ${event.name}`,
    description: event.description,
  };
  if (event.categories && event.categories.length) {
    item.categories = event.categories.join(',');
  }
  return item;
}

const CALENDAR_META: Record<string, string> = {
  'gi-event': '原神活动·关键日',
  'sr-event': '崩坏星穹铁道活动·关键日',
  'zzz-event': '绝区零活动·关键日',
  'ark-event': '明日方舟活动·关键日',
  'ba-event-jp': '蔚蓝档案日服活动·关键日',
  'ba-event-gl': '蔚蓝档案国际服活动·关键日',
  'ba-event-cn': '蔚蓝档案国服活动·关键日',
  'ww-event': '鸣潮活动·关键日',
  'end-event': '明日方舟终末地活动·关键日',
};

function getICS(moduleName: string): Vcalendar {
  const arcPathHelper = new PathHelper(`${moduleName}-arc`);
  if (existsSync(arcPathHelper.icsPath)) {
    return Vcalendar.fromString(Deno.readTextFileSync(arcPathHelper.icsPath));
  }

  const builder = new VcalendarBuilder();
  return builder
    .setVersion('2.0')
    .setProdId('-//SmallZombie//Anything ICS//ZH')
    .setName(CALENDAR_META[moduleName] ?? `${moduleName}·关键日`)
    .setRefreshInterval('P1D')
    .setCalScale('GREGORIAN')
    .setTzid(TZID)
    .setTzoffset('+0800')
    .build();
}

function generateArc(moduleName: string) {
  const pathHelper = new PathHelper(moduleName);
  const arcPathHelper = new PathHelper(`${moduleName}-arc`);

  if (!existsSync(pathHelper.jsonPath)) {
    console.log(`[!] Skip "${moduleName}": JSON not found at "${pathHelper.jsonPath}"`);
    return;
  }

  const events: EventJson[] = JSON.parse(Deno.readTextFileSync(pathHelper.jsonPath));
  const ics = getICS(moduleName);
  const arcItems = getArcItems(events, moduleName);

  ics.items = ics.items.filter((v) => {
    if (!arcItems.some((vv) => vv.uid === v.uid)) {
      console.log(`[!] Remove "${v.summary}"(${v.uid}) in "${moduleName}-arc.ics"`);
      ics.hasChanged = true;
      return false;
    }
    return true;
  });

  for (const item of arcItems) {
    let icsItem = ics.items.find((v) => v.uid === item.uid);
    if (!icsItem) {
      icsItem = new Vevent(item.uid);
      ics.items.push(icsItem);
    }

    icsItem.dtstart = item.date;
    icsItem.dtend = undefined;
    icsItem.rrule = undefined;
    icsItem.summary = item.summary;
    icsItem.description = item.description;
    icsItem.categories = item.categories;

    if (icsItem.hasChanged) {
      console.log(`categories: ${item.categories}(${typeof item.categories})`);
      console.log(`[!] Update "${item.summary}"(${item.uid}) in "${moduleName}-arc.ics"`);
    }
  }

  if (ics.hasChanged) {
    Deno.writeTextFileSync(arcPathHelper.icsPath, ics.toString());
    console.log(`[√] Saved "${arcPathHelper.icsPath}"`);
  } else {
    console.log(`[-] No changes for "${moduleName}-arc.ics"`);
  }
}

function main() {
  for (const moduleName of Object.keys(CALENDAR_META)) {
    generateArc(moduleName);
  }
}

main();
