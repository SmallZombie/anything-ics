import { load } from 'cheerio';
import { CharacterType } from './type/CharacterType.ts';
import { CharacterDetailType } from './type/CharacterDetailType.ts';


async function getAllCharacters(): Promise<CharacterType[]> {
    const res = await fetch('https://www.gamekee.com/ba').then(res => res.text());
    const $ = load(res);

    const dataURL = $('script[src^="/ssr-vuex-store-state.js"]').attr('src')!;
    const dataRes = await fetch('https://www.gamekee.com' + dataURL).then(res => res.text());
    const tempData = JSON.parse(dataRes.slice('window.__INITIAL_STATE__ = '.length)) as {
        ssrComponentData: {
            componentName: string;
            componentData: string;
        }[];
    };
    const tempData2 = JSON.parse(tempData.ssrComponentData.find(v => v.componentName === 'wikiHome')!.componentData) as {
        entryList: {
            id: number;
            child: {
                id: number;
                child: {
                    name: string;
                    content_id: number;
                }[];
            }[];
        }[];
    };

    const characters = tempData2.entryList.find(v => v.id === 23941)!.child.find(v => v.id === 49443)!.child;
    return characters.filter(v => !v.name.endsWith('）')).map(v => ({
        id: v.content_id,
        name: v.name
    }));
}

async function getCharacterDetail(id: number): Promise<CharacterDetailType> {
    const res = await fetch(`https://www.gamekee.com/ba/${id}.html`).then(res => res.text());
    const $ = load(res);

    // "2月19日"
    const birthdayStr =$('tbody:has(tr td span:contains("学生信息")) tr:has(td:contains("生日")) td:last-child > div').first().text();
    const birthdayStr2 = birthdayStr.replace('月', '/').replace('日', '');

    // "2021/02/04"
    const releaseStr = $('tbody tr:has(td:nth-of-type(1) > div > img):has(td:nth-of-type(2) > div):has(td:nth-child(3) > div img)').first().text();

    // 有些时候会有编辑中的角色，并且 getAll 中是无法辨别的，只能在这里返回空值了
    return {
        birthday: birthdayStr2 ? new Date(birthdayStr2 + ' UTC+0800') : void 0,
        release: releaseStr ? new Date(releaseStr + ' UTC+0800') : void 0
    }
}


export {
    getAllCharacters,
    getCharacterDetail
}
