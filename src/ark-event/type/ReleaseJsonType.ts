export type ReleaseJsonType = {
  id: string;
  name: string;
  categories: string[];
  description?: string; // the id in the official site URL
  // ISO 8601
  start: string;
  end: string;
}[];
