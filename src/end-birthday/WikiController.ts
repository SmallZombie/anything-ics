import { CharacterType } from './type/CharacterType.ts';
import { parse } from 'lossless-json';

async function getAllCharacters(): Promise<CharacterType[]> {
    // 获取最新版本
    const versionResult = await fetch(`https://data.akedata.wiki/manifest.json?t=${new Date().getTime()}`).then(res => res.json()) as {
        latest: string;
    }
    const latestGameVersion = versionResult.latest.split('@')[0];
    const latestHotfixVersion = versionResult.latest.split('@')[1];

    // 获取角色表
    const characterTableResult = await fetch(`https://data.akedata.wiki/public/${latestGameVersion}/${latestHotfixVersion}/TableCfg/CharacterTable.json`).then(res => res.text());
    const characterTableData = parse(characterTableResult) as {
        [key: string]: {
            name: {
                id: bigint;
            };
            profileRecord: {
                recordDesc: {
                    id: bigint;
                }
            }[];
        }
    }

    // 获取本地化文件
    const i18nResult = await fetch(`https://data.akedata.wiki/public/${latestGameVersion}/${latestHotfixVersion}/TableCfg/I18nTextTable_CN.json`).then(res => res.json()) as {
        [key: string]: string,
    }

    const characters: CharacterType[] = [];
    for (const key of Object.keys(characterTableData)) {
        const value = characterTableData[key];

        const name = i18nResult[value.name.id.toString()];
        if (!name) continue;

        const recordIds = value.profileRecord.map(v => v.recordDesc.id);
        const recordText = recordIds.map(v => i18nResult[v.toString()] ?? '').join('\n');

        const match = /【生日】(\d{1,2})月(\d{1,2})日/.exec(recordText);
        if (!match) continue;

        const month = Number(match[1]);
        const day = Number(match[2]);

        const birthday = new Date(`${month}/${day} UTC+0800`);
        characters.push({
            id: key,
            name: name,
            birthday,
        });
    }

    return characters;
}

export {
    getAllCharacters
}
