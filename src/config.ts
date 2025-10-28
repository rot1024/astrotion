export { default } from "./customization/config";

export const auth = import.meta.env.NOTION_API_SECRET;
export const dataSourceId = import.meta.env.DATA_SOURCE_ID;
export const debug = !!import.meta.env.DEBUG;
export const site = import.meta.env.SITE || "http://localhost:3000";
