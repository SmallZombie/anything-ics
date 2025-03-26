import { EventType } from './EventType.ts';


export type CNEventType = EventType & {
    start: Date;
    end: Date;
    slug: '';
    feature: '';
}
