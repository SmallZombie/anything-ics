export type ReleaseJsonType = {
  id: string;
  name: string;
  categories: string[];
  siteId?: string; // the id in the official site URL
  // ISO 8601
  start: string;
  end: string;
}[];
