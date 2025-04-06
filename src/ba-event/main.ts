import { PathHelper, timeout, Vcalendar, VcalendarBuilder, Vevent } from '../BaseUtil.ts';
import { getCNAllEvents, getEventDetail, getGLAllEvents, getJPAllEvents } from './WikiController.ts';
import { ReleaseJsonType } from './type/ReleaseJsonType.ts';
import { existsSync } from '@std/fs/exists';
import { ServerEnum } from './enum/ServerEnum.ts';
import { CNEventType } from './type/CNEventType.ts';


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
    const events = await (() => {
        switch (server) {
            case ServerEnum.GL: return getGLAllEvents();
            case ServerEnum.JP: return getJPAllEvents();
            case ServerEnum.CN: return getCNAllEvents();
            default: throw new Error(`Invalid server: "${server}"`);
        }
    })();

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

        const { start, end } = await (() => {
            switch (server) {
                case ServerEnum.GL: return getEventDetail(ServerEnum.GL, item.slug, item.feature);
                case ServerEnum.JP: return getEventDetail(ServerEnum.JP, item.slug, item.feature);
                case ServerEnum.CN: return {
                    start: (item as CNEventType).start,
                    end: (item as CNEventType).end
                };
            }
        })();
        const dtstart = ics.dateToDateTime(start);
        const dtend = ics.dateToDateTime(end);

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
            start: start.toISOString(),
            end: end.toISOString(),
            description: item.description ? item.description : void 0
        });

        if (server !== ServerEnum.CN) {
            await timeout(200);
        }
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
