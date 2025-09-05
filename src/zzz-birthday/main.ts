import { getDateByTimezone, getMonthByTimezone, Vcalendar, VcalendarBuilder, Vevent, getFullYearByTimezone, PathHelper } from '../BaseUtil.ts';
import { getAllCharacters } from './WikiController.ts';
import { ReleaseJsonType } from './type/ReleaseJsonType.ts';
import { existsSync } from '@std/fs/exists';


const ModuleName = 'zzz-birthday';
const pathHelper = new PathHelper(ModuleName);

function getICS(): Vcalendar {
    if (existsSync(pathHelper.icsPath)) {
        return Vcalendar.fromString(Deno.readTextFileSync(pathHelper.icsPath));
    } else {
        const builder = new VcalendarBuilder();
        const vcalendar: Vcalendar = builder
            .setVersion('2.0')
            .setProdId('-//SmallZombie//Anything ICS//ZH')
            .setName('绝区零生日日历')
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
    characters.sort((a, b) => a.id.localeCompare(b.id));

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
        const birthdayMonth = getMonthByTimezone(item.birthday, ics.tzid);
        const birthdayDate = getDateByTimezone(item.birthday, ics.tzid);
        const releaseStr = `${getFullYearByTimezone(item.release, ics.tzid)}${String(getMonthByTimezone(item.release, ics.tzid)).padStart(2, '0')}${String(getDateByTimezone(item.release, ics.tzid)).padStart(2, '0')}`;
        const rrule = `FREQ=YEARLY;BYMONTH=${String(birthdayMonth).padStart(2, '0')};BYMONTHDAY=${String(birthdayDate).padStart(2, '0')}`;

        const itemID = `${ModuleName}-${item.id}`;
        let icsItem = ics.items.find(v => v.uid === itemID);
        if (!icsItem) {
            icsItem = new Vevent(itemID);
            ics.items.push(icsItem);
        }

        icsItem.dtstart = releaseStr;
        icsItem.rrule = rrule;
        icsItem.summary = item.name + '的生日';

        if (icsItem.hasChanged) {
            console.log(`${i + 1}/${characters.length} Update "${item.name}"(${item.id}) in ICS`);
        }

        json.push({
            id: item.id,
            name: item.name,
            birthday: {
                month: birthdayMonth,
                day: birthdayDate
            },
            release: item.release.toISOString()
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
