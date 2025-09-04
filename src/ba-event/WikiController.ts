import { EventType } from './type/EventType.ts';
import { ServerEnum } from './enum/ServerEnum.ts';


type EventData = {
    Events: {
        Id: number,
        // 时间戳单位都是秒
        // 初版
        Original: {
            EventOpenJp: number,
            EventCloseJp: number,
            EventOpenGlobal?: number,
            EventCloseGlobal?: number,
            EventOpenCn?: number,
            EventCloseCn?: number
        }
        // 复刻
        Rerun?: {
            EventOpenJp: number,
            EventCloseJp: number,
            EventOpenGlobal?: number,
            EventCloseGlobal?: number,
            EventOpenCn?: number,
            EventCloseCn?: number
        }
        // 常驻
        Permanent?: {
            EventOpenJp: number,
            EventOpenGlobal: number,
            EventOpenCn: number
        }
    }[]
}

type LocalizationData = {
    EventName: {
        [key: number]: string
    }
}


async function getAllEvents(server: ServerEnum): Promise<EventType[]> {
    const _server = server === ServerEnum.GL ? 'en' : server;

    // 感谢伟大的 SchaleDB!
    const eventData = await fetch(`https://schaledb.brightsu.cn/data/${_server}/events.min.json`).then(res => res.json()) as EventData;
    const localizationData = await fetch(`https://schaledb.brightsu.cn/data/${_server}/localization.min.json`).then(res => res.json()) as LocalizationData;


    const processor = _getProcessor(server);
    return processor(eventData, localizationData);
}

function _getProcessor(server: ServerEnum) {
    switch (server) {
        case ServerEnum.JP: return _JPResultProcessor;
        case ServerEnum.GL: return _GLResultProcessor;
        case ServerEnum.CN: return _CNResultProcessor;
        default: throw new Error('Invaild server');
    }
}

function _JPResultProcessor(eventData: EventData, localizationData: LocalizationData): EventType[] {
    const result: EventType[] = [];

    for (const i of eventData.Events) {
        if (i.Original.EventOpenJp) result.push({
            id: 'o' + i.Id,
            name: localizationData.EventName[i.Id],
            start: new Date(i.Original.EventOpenJp * 1000),
            end: new Date(i.Original.EventCloseJp! * 1000)
        });
        if (i.Rerun && i.Rerun.EventOpenJp) result.push({
            id: 'r' + i.Id,
            name: localizationData.EventName[i.Id],
            start: new Date(i.Rerun.EventOpenJp * 1000),
            end: new Date(i.Rerun.EventCloseJp! * 1000)
        });
    }

    return result;
}

function _GLResultProcessor(eventData: EventData, localizationData: LocalizationData): EventType[] {
    const result: EventType[] = [];

    for (const i of eventData.Events) {
        if (i.Original.EventOpenGlobal) result.push({
            id: 'o' + i.Id,
            name: localizationData.EventName[i.Id],
            start: new Date(i.Original.EventOpenGlobal * 1000),
            end: new Date(i.Original.EventCloseGlobal! * 1000)
        });
        if (i.Rerun && i.Rerun.EventOpenGlobal) result.push({
            id: 'r' + i.Id,
            name: localizationData.EventName[i.Id],
            start: new Date(i.Rerun.EventOpenGlobal * 1000),
            end: new Date(i.Rerun.EventCloseGlobal! * 1000)
        });
    }

    return result;
}

function _CNResultProcessor(eventData: EventData, localizationData: LocalizationData): EventType[] {
    const result: EventType[] = [];

    for (const i of eventData.Events) {
        if (i.Original.EventOpenCn) result.push({
            id: 'o' + i.Id,
            name: localizationData.EventName[i.Id],
            start: new Date(i.Original.EventOpenCn * 1000),
            end: new Date(i.Original.EventCloseCn! * 1000)
        });
        if (i.Rerun && i.Rerun.EventOpenCn) result.push({
            id: 'r' + i.Id,
            name: localizationData.EventName[i.Id],
            start: new Date(i.Rerun.EventOpenCn * 1000),
            end: new Date(i.Rerun.EventCloseCn! * 1000)
        });
    }

    return result;
}


export {
    getAllEvents
}
