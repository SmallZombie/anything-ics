import { load } from 'cheerio';
import { crc32 } from '@deno-library/crc32';
import { CharacterType } from './type/CharacterType.ts';
import { CharacterDetailType } from './type/CharacterDetailType.ts';


async function getAllCharacters(): Promise<CharacterType[]> {
    const res = await fetch('https://prts.wiki/w/干员一览').then(res => res.text());
    const $ = load(res);

    const result: CharacterType[] = [];
    $('#filter-data > div').each((_i, v) => {
        if ($(v).attr('data-tag')!.includes('支援机械')) {
            return;
        }

        const name = $(v).attr('data-zh')!;
        result.push({
            id: crc32(name),
            name
        });
    });

    return result;
}

async function getCharacterDetail(name: string): Promise<CharacterDetailType> {
    const res = await fetch('https://prts.wiki/w/' + name).then(res => res.text());
    const $ = load(res);

    const releaseStr = $('tbody tr').filter((_i, v) => $(v).find('th').text().trim() === '上线时间').find('td').text().trim();
    const releaseStr2 = releaseStr.replace('年', '/').replace('月', '/').replace('日', '');
    const release = new Date(releaseStr2 + ' UTC+0800');

    const birthdayStr = $('tbody tr td div').filter((_i, v) => $(v).text().includes('【生日】')).text().trim();
    // "【生日】12月23日"，用正则匹配出来
    const birthdayMatch = birthdayStr.match(/【生日】(\d+月\d+日)/);
    // 有些干员没生日，比如 "W"
    if (!birthdayMatch) return { release }
    const birthdayStr3 = birthdayMatch[1].replace('月', '/').replace('日', '');
    const birthday = new Date(birthdayStr3 + ' UTC+0800');


    return { birthday, release }
}


export {
    getAllCharacters,
    getCharacterDetail
}
