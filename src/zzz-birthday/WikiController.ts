import { crc32 } from '@deno-library/crc32';
import { CharacterType } from './type/CharacterType.ts';


async function getAllCharacters(): Promise<CharacterType[]> {
    // 米游社wiki没有角色上线日期，还得是b站wiki
    const charactersData = await fetch('https://wiki.biligame.com/zzz/api.php?action=ask&query=[[分类:角色]][[实装日期::!未实装]]|?实装日期|?生日|limit=1000&format=json').then(res => res.json()) as {
        query: {
            results: {
                [key: string]: {
                    fulltext: string,
                    printouts: {
                        // 2024年07月04日
                        '实装日期': [string?],
                        // 2月20日
                        '生日': [string?]
                    }
                }
            }
        }
    }


    const result: CharacterType[] = [];
    for (const i of Object.values(charactersData.query.results)) {
        const releaseStr = i.printouts['实装日期'][0]!.replace(/(\d+)年(\d+)月(\d+)日/g, '$1/$2/$3');
        const releaseDate = new Date(releaseStr + ' UTC+0800');
        const birthdayStr = i.printouts['生日'][0]!.replace(/(\d+)月(\d+)日/g, '$1/$2');
        const birthdayDate = new Date(`${releaseDate.getFullYear()}/${birthdayStr} UTC+0800`);

        result.push({
            id: crc32(i.fulltext),
            name: i.fulltext,
            release: releaseDate,
            birthday: birthdayDate
        });
    }

    return result;
}


export {
    getAllCharacters
}
