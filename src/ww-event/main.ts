import { Vcalendar, VcalendarBuilder, Vevent } from '../BaseUtil.ts';
import { getAllEvents } from './WikiController.ts';
import { ReleaseJsonType } from './type/ReleaseJsonType.ts';
import { existsSync } from '@std/fs/exists';
import { PathHelper } from '../BaseUtil.ts';


const ModuleName = 'ww-event';
const pathHelper = new PathHelper(ModuleName);

function getICS(): Vcalendar {
    if (existsSync(pathHelper.icsPath)) {
        return Vcalendar.fromString(Deno.readTextFileSync(pathHelper.icsPath));
    } else {
        const builder = new VcalendarBuilder();
        const vcalendar: Vcalendar = builder
            .setVersion('2.0')
            .setProdId('-//SmallZombie//Anything ICS//ZH')
            .setName('鸣潮活动日历')
            .setRefreshInterval('P1D')
            .setCalScale('GREGORIAN')
            .setTzid('Asia/Shanghai')
            .setTzoffset('+0800')
            .build();
        return vcalendar;
    }
}

async function main() {
    const ics = getICS();
    const json: ReleaseJsonType = [];
    const events = await getAllEvents();
    events.sort((a, b) => a.id - b.id);

    ics.items = ics.items.filter(v => {
        if (!events.some(vv => `${ModuleName}-${vv.id}` === v.uid)) {
            console.log(`[!] Remove "${v.summary}"(${v.uid}) in ICS`);
            ics.hasChanged = true;
            return false;
        }
        return true;
    });

    console.log('[!] Total Events: ', events.length);
    for (let i = 0; i < events.length; i++) {
        const item = events[i];
        const dtstart = ics.dateToDateTime(item.start);
        const dtend = ics.dateToDateTime(item.end);

        const itemID = `${ModuleName}-${item.id}`;
        let icsItem = ics.items.find(v => v.uid === itemID);
        if (!icsItem) {
            icsItem = new Vevent(itemID, '', dtstart);
            ics.items.push(icsItem);
        }
        icsItem.dtend = dtend;
        icsItem.summary = item.name;
        icsItem.description = item.description;

        if (icsItem.hasChanged) {
            console.log(`${i + 1}/${events.length} Update "${item.name}"(${item.id}) in ICS`);
        }

        json.push({
            id: item.id,
            name: item.name,
            start: item.start.toISOString(),
            end: item.end.toISOString(),
            description: item.description,
        });
    }

    if (ics.hasChanged) {
        Deno.writeTextFileSync(pathHelper.icsPath, ics.toString());
        console.log(`[√] ICS Has Save To "${pathHelper.icsPath}"`);
    } else {
        console.log('[-] No need to save ICS');
    }

    Deno.writeTextFileSync(pathHelper.jsonPath, JSON.stringify(json, null, 4));
    console.log(`[√] JSON Has Save To "${pathHelper.jsonPath}"`);
}
main();
