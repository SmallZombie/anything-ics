export type EventType = {
    id: string;
    // 用来获取详情的，国服没有
    slug: string;
    // 特征，用于识别章节，此处为分割出的 startStr，国服没有
    feature: string;
    name: string;
    description?: string;
}
