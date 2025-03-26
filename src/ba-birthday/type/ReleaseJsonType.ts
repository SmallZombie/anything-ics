type ReleaseJsonType = ReleaseJsonItemType[];

type ReleaseJsonItemType = {
    id: number;
    name: string;
    birthday: {
        month: number;
        day: number;
    },
    // ISO 8601
    release: string;
}


export type {
    ReleaseJsonType,
    ReleaseJsonItemType
}
