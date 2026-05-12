import { CharacterType } from './type/CharacterType.ts';
import { CharacterDetailType } from './type/CharacterDetailType.ts';


async function getAllCharacters(): Promise<CharacterType[]> {
    // 2026.5.13: gamekee 加 edgeone 了，换个 wiki，让我们感谢鸡窝托斯古书馆
    const res = await fetch('https://api.kivo.wiki/api/v1/data/students/?page=1&page_size=500&is_npc=false&is_install=true').then(res => res.json()) as {
        data: {
            max_page: number,
            students: [{
                id: number,
                skin: string,
                family_name: string,
                given_name: string,
                family_name_jp: string,
                given_name_jp: string,
            }]
        }
    };

    return res.data.students.filter(v => {
        // 过滤掉皮肤
        if (v.skin) return false;

        // 过滤掉没有生日的
        return ![
            // 食蜂 操祈
            316,
            // 佐天 泪子
            317,
        ].includes(v.id);
    }).map(v => ({
        id: v.id,
        name: `${v.family_name_jp} ${v.given_name_jp} (${v.family_name ? `${v.family_name} ${v.given_name}` : v.given_name})`,
    }));
}

async function getCharacterDetail(id: number): Promise<CharacterDetailType> {
    const res = await fetch(`https://api.kivo.wiki/api/v1/data/students/${id}`,).then(res => res.json()) as {
        data: {
            family_name: string,
            given_name: string,
            birthday: string, // 05-16
            release_date: string, // 2021-02-04
        }
    }

    console.log(res.data.family_name, res.data.given_name);

    const birthdayText = res.data.birthday.replace('-', '/');
    return {
        birthday: new Date(`${birthdayText} UTC+0800`),
        release: new Date(`${res.data.release_date} UTC+0800`),
    }
}


export {
    getAllCharacters,
    getCharacterDetail
}
