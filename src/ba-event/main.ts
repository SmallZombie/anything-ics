import { PathHelper, Vcalendar, VcalendarBuilder, Vevent } from '../BaseUtil.ts';
import { ReleaseJsonType } from './type/ReleaseJsonType.ts';
import { existsSync } from '@std/fs/exists';
import { ServerEnum } from './enum/ServerEnum.ts';
import { getAllEvents, getAllRaidSeasons } from './BaseController.ts';


function getICS(path: string): Vcalendar {
    if (existsSync(path)) {
        return Vcalendar.fromString(Deno.readTextFileSync(path));
    } else {
        const builder = new VcalendarBuilder();
        const vcalendar: Vcalendar = builder
            .setVersion('2.0')
            .setProdId('-//SmallZombie//Anything ICS//ZH')
            .setName('蔚蓝档案活动日历')
            .setRefreshInterval('P1D')
            .setCalScale('GREGORIAN')
            .setTzid('Asia/Shanghai')
            .setTzoffset('+0800')
            .build();
        return vcalendar;
    }
}

async function main(server: ServerEnum) {
    console.log(`[***] Running At "${server}"`);
    const ModuleName = 'ba-event-' + server;
    const pathHelper = new PathHelper(ModuleName);
    const ics = getICS(pathHelper.icsPath);
    const json: ReleaseJsonType = [];
    const events = [
        ...await getAllEvents(server),
        ...await getAllRaidSeasons(server)
    ];
    events.sort((a, b) => a.id.localeCompare(b.id));

    ics.items = ics.items.filter(v => {
        if (!events.some(vv => `${ModuleName}-${vv.id}` === v.uid)) {
            console.log(`[!] Remove "${v.summary}"(${v.uid}) in ICS`);
            ics.hasChanged = true;
            return false;
        }
        return true;
    });

    console.log('[!] Total Events:', events.length);
    for (let i = 0; i < events.length; i++) {
        const item = events[i];
        const itemID = `${ModuleName}-${item.id}`;
        let icsItem = ics.items.find(v => v.uid === itemID);
        if (!icsItem) {
            icsItem = new Vevent(itemID);
            ics.items.push(icsItem);
        }

        icsItem.dtstart = ics.dateToDateTime(item.start);
        icsItem.dtend = ics.dateToDateTime(item.end);
        icsItem.summary = item.name;

        if (icsItem.hasChanged) {
            console.log(`${i + 1}/${events.length} Update "${item.name}"(${item.id}) in ICS`);
        }

        json.push({
            id: item.id,
            name: item.name,
            start: item.start.toISOString(),
            end: item.end.toISOString()
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

    console.log('[***] Done\n');
}


main(ServerEnum.GL)
    .then(() => main(ServerEnum.JP))
    .then(() => main(ServerEnum.CN));
