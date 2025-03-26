export type ReleaseJsonType = {
    id: number;
    name: string;
    birthday: {
        month: number;
        day: number;
    };
    // ISO 8601
    release?: string;
}[];
