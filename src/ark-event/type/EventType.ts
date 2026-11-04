export type EventType = {
  id: string;
  name: string;
  start: Date;
  end: Date;
  categories: string[];
  description?: string; // the id in the official site URL
};
