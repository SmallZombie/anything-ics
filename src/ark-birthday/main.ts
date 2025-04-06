import { getDateByTimezone, getFullYearByTimezone, getMonthByTimezone, PathHelper, timeout, Vcalendar, VcalendarBuilder, Vevent } from '../BaseUtil.ts';
import { getAllCharacters, getCharacterDetail } from './WikiController.ts';
import { ReleaseJsonType } from './type/ReleaseJsonType.ts';
import { existsSync } from '@std/fs/exists';


const ModuleName = 'ark-birthday';
const pathHelper = new PathHelper(ModuleName);

function getICS(): Vcalendar {
    if (existsSync(pathHelper.icsPath)) {
        return Vcalendar.fromString(Deno.readTextFileSync(pathHelper.icsPath));
    } else {
        const builder = new VcalendarBuilder();
        const vcalendar: Vcalendar = builder
            .setVersion('2.0')
            .setProdId('-//SmallZombie//Anything ICS//ZH')
            .setName('明日方舟生日日历')
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
    const characters = await getAllCharacters();

    ics.items = ics.items.filter(v => {
        if (!characters.some(vv => `${ModuleName}-${vv.id}` === v.uid)) {
            console.log(`[!] Remove "${v.summary}"(${v.uid}) in ICS`);
            ics.hasChanged = true;
            return false;
        }
        return true;
    });

    console.log('[!] Total Characters: ', characters.length);
    for (let i = 0; i < characters.length; i++) {
        const item = characters[i];
        const { birthday, release } = await getCharacterDetail(item.name);

        const itemID = `${ModuleName}-${item.id}`;
        let icsItem = ics.items.find(v => v.uid === itemID);
        if (birthday) {
            const rrule = birthday ? `FREQ=YEARLY;BYMONTH=${String(getMonthByTimezone(birthday, ics.tzid)).padStart(2, '0')};BYMONTHDAY=${String(getDateByTimezone(birthday, ics.tzid)).padStart(2, '0')}` : '';
            if (!icsItem) {
                const dtstart = `${getFullYearByTimezone(release, ics.tzid)}${String(getMonthByTimezone(release, ics.tzid)).padStart(2, '0')}${String(getDateByTimezone(release, ics.tzid)).padStart(2, '0')}`;
                icsItem = new Vevent(itemID, '', dtstart);
                ics.items.push(icsItem);
            }
            icsItem.rrule = rrule;
            icsItem.summary = item.name + ' 生日';
            if (icsItem.hasChanged) {
                console.log(`${i + 1}/${characters.length} Update "${item.name}"(${item.id}) in ICS`);
            }
        }

        json.push({
            id: item.id,
            name: item.name,
            birthday: birthday ? {
                month: getMonthByTimezone(birthday, ics.tzid),
                day: getDateByTimezone(birthday, ics.tzid)
            } : void 0,
            release: release.toISOString()
        });

        await timeout(200);
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
