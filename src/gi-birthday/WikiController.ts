import { CharacterDetailType } from './type/CharacterDetailType.ts';
import { CharacterType } from './type/CharacterType.ts';


async function getAllCharacters(): Promise<CharacterType[]> {
    const result = await fetch('https://api-takumi-static.mihoyo.com/common/blackboard/ys_obc/v1/home/content/list?app_sn=ys_obc&channel_id=189').then(res => res.json()) as {
        data: {
            list: {
                name: string;
                children: {
                    name: string;
                    list: {
                        title: string;
                        content_id: number;
                    }[];
                }[];
            }[];
        };
    };
    const characters = result.data.list.find(v => v.name === '图鉴')!.children.find(v => v.name === '角色')!.list;
    return characters.filter(v => {
        if (v.title.includes('预告')) return false;
        if (v.title.includes('旅行者')) return false;
        return true;
    }).map(v => ({
        id: v.content_id,
        name: v.title
    }));
}

/** 获取角色生日和角色上线时间 */
async function getCharacterDetail(charactersID: number): Promise<CharacterDetailType> {
    const res = await fetch('https://api-takumi-static.mihoyo.com/hoyowiki/genshin/wapi/entry_page?entry_page_id=' + charactersID).then(res => res.json()) as {
        data: {
            page: {
                modules: {
                    name: string;
                    components: {
                        data: string;
                    }[];
                }[];
            };
        };
    };
    // "11月11日"
    const birthdayText = JSON.parse(res.data.page.modules.find(v => v.name === '基础信息')!.components[0].data).attr.find((v: { key: string }) => v.key === '生日')!.value[0];
    const [, birthdayMonth, birthdayDay] = birthdayText.match(/(\d+)月(\d+)日/);

    const birthday = new Date();
    birthday.setMonth(parseInt(birthdayMonth) - 1);
    birthday.setDate(parseInt(birthdayDay));

    // 有些角色没有宣发时间
    const haveRelease = res.data.page.modules.find(v => v.name === '角色宣发时间轴');
    if (!haveRelease) return { birthday }; // 神里绫华(2123) & 埃洛伊(2415)

    // 有些角色没有角色登场
    const haveRelease2 = JSON.parse(haveRelease.components[0].data).list.find((v: { tab_name: string }) => v.tab_name.includes('角色登场'));
    if (!haveRelease2) return { birthday }; // 神里绫华(2123)

    // "「2024.07.15」角色登场"
    const releaseText = haveRelease2.tab_name.match(/「(.+)」/)[1];

    // 250120 这里 "蓝砚" 的是 "「20xx.xx.xx」角色登场"
    // 貌似是 wiki 模板默认的内容，总之要排除
    if (releaseText.includes('x')) {
        return { birthday };
    }

    const release = new Date(releaseText);
    return { birthday, release };
}


export {
    getAllCharacters,
    getCharacterDetail
}
