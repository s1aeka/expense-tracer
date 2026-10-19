import {CATEGORIES, Category, DEFAULT_CURRENCY} from './config';

export const currencySynonyms: Record<string, 'MYR'|'KZT'> = {
  rm: 'MYR',
  рм: 'MYR',
  ринг: 'MYR',
  ринггит: 'MYR',
  myr: 'MYR',
  MYR: 'MYR',
  tg: 'KZT',
  тг: 'KZT',
  тенге: 'KZT',
  '₸': 'KZT',
  kzt: 'KZT',
  KZT: 'KZT'
};

export function normalizeCurrency(s?: string){
  if(!s) return DEFAULT_CURRENCY;
  const key = s.trim().toLowerCase();
  return currencySynonyms[key] ?? (key.toUpperCase() === 'MYR' ? 'MYR' : (key.toUpperCase() === 'KZT' ? 'KZT' : DEFAULT_CURRENCY));
}

export function validateCategory(cat: string): cat is Category {
  return (CATEGORIES as readonly string[]).includes(cat);
}

export interface ParsedExpense {
  name: string;
  amount: number;
  currency: 'MYR'|'KZT';
  category: Category;
}

export function validateParsedExpense(obj: any): obj is ParsedExpense {
  if(!obj || typeof obj !== 'object') return false;
  const {name, amount, currency, category} = obj as any;
  if(typeof name !== 'string' || name.trim().length === 0) return false;
  if(typeof amount !== 'number' || !isFinite(amount) || amount <= 0) return false;
  if(currency !== 'MYR' && currency !== 'KZT') return false;
  if(!validateCategory(category)) return false;
  return true;
}
