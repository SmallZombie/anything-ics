export type EventType = {
  id: string;
  name: string;
  start: Date;
  end: Date;
  categories: string[];
  siteId?: string; // the id in the official site URL
};
