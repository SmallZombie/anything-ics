import { load } from 'cheerio';
import { crc32 } from '@deno-library/crc32';
import { CharacterType } from './type/CharacterType.ts';
import { CharacterDetailType } from './type/CharacterDetailType.ts';


async function getAllCharacters(): Promise<CharacterType[]> {
    // 米游社wiki没有角色上线日期，还得是b站wiki
    const res = await fetch('https://wiki.biligame.com/zzz/角色图鉴').then(res => res.text());
    const $ = load(res);

    const result: CharacterType[] = [];
    $('#CardSelectTr .role-box').each((i, v) => {
        const name = $(v).find('.role-name a').text();
        result.push({
            id: crc32(name),
            name
        });
    });

    return result;
}

async function getCharacterDetail(name: string): Promise<CharacterDetailType> {
    const res = await fetch('https://wiki.biligame.com/zzz/' + name).then(res => res.text());
    const $ = load(res);

    // "6月19日"
    const birthdayStr = $('tbody tr').find('th').filter((_i, el) => $(el).text().trim() === '生日').parent().find('td').text().trim();
    // "2024年12月18日（1.4版本）" or "2024年12月18日"
    const releaseStr = $('tbody tr').find('th').filter((_i, el) => $(el).text().trim() === '实装日期').parent().find('td').text().trim();

    const birthdayStr2 = birthdayStr.replace('月', '/').replace('日', '');
    const releaseStr2 = releaseStr.includes('（') ? releaseStr.split('（')[0] : releaseStr;
    const releaseStr3 = releaseStr2.replace('年', '/').replace('月', '/').replace('日', '');

    return {
        birthday: new Date(birthdayStr2 + ' UTC+0800'),
        release: new Date(releaseStr3 + ' UTC+0800')
    }
}


export {
    getAllCharacters,
    getCharacterDetail
}
