import { PathHelper, Vcalendar, VcalendarBuilder, Vevent, getDateByTimezone, getFullYearByTimezone, getMonthByTimezone, timeout } from '../BaseUtil.ts';
import { getAllCharacters, getCharacterDetail } from './WikiController.ts';
import { ReleaseJsonType } from './type/ReleaseJsonType.ts';
import { existsSync } from '@std/fs/exists';


const ModuleName = 'gi-birthday';
const pathHelper = new PathHelper(ModuleName);

function getICS(): Vcalendar {
    if (existsSync(pathHelper.icsPath)) {
        return Vcalendar.fromString(Deno.readTextFileSync(pathHelper.icsPath));
    } else {
        const builder = new VcalendarBuilder();
        const vcalendar: Vcalendar = builder
            .setVersion('2.0')
            .setProdId('-//SmallZombie//Anything ICS//ZH')
            .setName('原神生日日历')
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
    characters.sort((a, b) => a.id - b.id);

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

        const { birthday, release } = await getCharacterDetail(item.id);

        const birthdayMonth = getMonthByTimezone(birthday, ics.tzid);
        const birthdayDay = getDateByTimezone(birthday, ics.tzid);
        // 20200928 是原神公测时间，没有发布时间的按公测时间算
        const releaseStr = release ? `${getFullYearByTimezone(release, ics.tzid)}${String(getMonthByTimezone(release, ics.tzid)).padStart(2, '0')}${String(getDateByTimezone(release, ics.tzid)).padStart(2, '0')}` : '20200928';
        const rrule = `FREQ=YEARLY;BYMONTH=${String(birthdayMonth).padStart(2, '0')};BYMONTHDAY=${String(birthdayDay).padStart(2, '0')}`;

        const itemID = `${ModuleName}-${item.id}`;
        let icsItem = ics.items.find(v => v.uid === itemID);
        if (!icsItem) {
            icsItem = new Vevent(itemID, '', releaseStr);
            ics.items.push(icsItem);

        }
        icsItem.dtstart = releaseStr;
        icsItem.rrule = rrule;
        icsItem.summary = item.name + ' 生日';
        if (icsItem.hasChanged) {
            console.log(`${i + 1}/${characters.length} Update "${item.name}"(${item.id}) in ICS`);
        }

        json.push({
            id: item.id,
            name: item.name,
            birthday: {
                month: birthdayMonth,
                day: birthdayDay,
            },
            release: release ? release.toISOString() : void 0,
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
