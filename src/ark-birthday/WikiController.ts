import { crc32 } from '@deno-library/crc32';
import { CharacterType } from './type/CharacterType.ts';
import { retryWithBackoff } from '../BaseUtil.ts';

function getAllCharacters(): Promise<CharacterType[]> {
  return retryWithBackoff(fetchAllCharacters);
}

async function fetchAllCharacters(): Promise<CharacterType[]> {
  // Invistigation shows that chara_extra_info is a subset of char_obtain
  // and the characters exists only in the former are not operators in Arknights
  const characterExtraInfo = await fetchWithOffset(fetchCharacterExtraInfo, 500);
  const characterObtailInfo = await fetchWithOffset(fetchCharacterObtainInfo, 500);

  const characterMap = characterExtraInfo.flatMap((x) => {
    const birthdayString = x.title.dateOfBirth.match(/(\d+月\d+日)/);
    const birthday = birthdayString
      ? new Date(birthdayString[1].replace('月', '/').replace('日', '/') + ' UTC+0800')
      : undefined;
    return [{
      id: crc32(x.title.cn),
      name: x.title.cn,
      birthday,
    }];
  }).reduce((cur, val) => cur.set(val.name, val), new Map<string, Omit<CharacterType, 'release'>>());

  const result: CharacterType[] = [];
  for (const obtainInfo of characterObtailInfo) {
    const charcter = characterMap.get(obtainInfo.title.cn);
    if (!charcter) {
      // character has not extra info is not seen as an operator
      continue;
    }
    result.push({ ...charcter, release: new Date(obtainInfo.title.cnOnlineTime + ' UTC+0800') });
  }
  return result;
}

async function fetchCharacterObtainInfo(limit: number, offset: number) {
  const query = await fetch(
    `https://prts.wiki/api.php?action=cargoquery&format=json&limit=${limit}&offset=${offset}&tables=char_obtain,chara&fields=chara.cn,char_obtain.cnOnlineTime&where=chara.tag NOT LIKE '支援机械%' AND chara._pageName NOT LIKE '%(%)'&join_on=char_obtain._pageName=chara._pageName`,
  ).then((res) => res.json()) as {
    cargoquery: {
      title: {
        cn: string; // Chinese name
        cnOnlineTime: string; // mainly `12月23日`, sometimes `未录入`
      };
    }[];
  };
  return query.cargoquery;
}

async function fetchCharacterExtraInfo(limit: number, offset: number) {
  const query = await fetch(
    `https://prts.wiki/api.php?action=cargoquery&limit=${limit}&offset=${offset}&format=json&tables=chara_extra_info,chara&fields=chara.cn,chara_extra_info.dateOfBirth&where=chara.tag NOT LIKE '支援机械%' AND chara._pageName NOT LIKE '%(%)'&join_on=chara_extra_info._pageName=chara._pageName`,
  ).then((res) => res.json()) as {
    cargoquery: {
      title: {
        cn: string; // Chinese name
        dateOfBirth: string; // 2019-04-30 10:00:00 (UTC+8 time)
      };
    }[];
  };
  return query.cargoquery;
}

async function fetchWithOffset<T>(fn: (limit: number, offset: number) => Promise<T[]>, limit: number) {
  limit = Math.max(500, Math.min(1, limit)); // limit restriction from cargo
  let result: T[] = [];
  let fetched: T[] = [];
  let offset = 0;
  do {
    fetched = await fn(limit, offset);
    result = [...result, ...fetched];
    console.log(`[offset:${offset}/limit:${limit}] fetched ${fetched.length}`);
    offset += fetched.length;
  } while (fetched.length >= limit);
  return result;
}

export { getAllCharacters };
