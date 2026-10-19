export const DEFAULT_CURRENCY = 'MYR';
export const MODEL = 'claude-haiku-5-5';
export const TIMEZONE = 'Asia/Kuala_Lumpur';
export function nbkRatesUrlFor(dateStr: string) {
  // dateStr expected DD.MM.YYYY
  return `https://nationalbank.kz/rss/get_rates.cfm?fdate=${dateStr}`;
}
export const CATEGORIES = [
  'Еда вне дома','Продукты','Напитки','Сладкое','Такси','Транспорт','Здоровье','Учёба','Развлечения','Прочее'
] as const;
export type Category = (typeof CATEGORIES)[number];
