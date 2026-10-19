import fetch from 'node-fetch';
import {nbkRatesUrlFor} from './config';
import {parseStringPromise} from 'xml2js';

export async function fetchKztPerMyrForDate(dateStr: string): Promise<number> {
  // dateStr DD.MM.YYYY as required by NBK endpoint
  const url = nbkRatesUrlFor(dateStr);
  const res = await fetch(url);
  if(!res.ok) throw new Error(`NBK request failed: ${res.status}`);
  const text = await res.text();
  const xml = await parseStringPromise(text);
  // xml.rates.item is array; find item with title MYR
  const items = xml?.rates?.item ?? [];
  for(const it of items){
    const title = (it.title && it.title[0])?.toString?.() ?? '';
    if(title === 'MYR'){
      const desc = (it.description && it.description[0])?.toString?.();
      const quant = (it.quant && it.quant[0])?.toString?.();
      if(!desc) throw new Error('MYR description missing');
      const value = parseFloat(desc.replace(',','.'));
      const q = quant ? parseFloat(quant) : 1;
      if(!isFinite(value) || !isFinite(q) || q === 0) throw new Error('Invalid NBK value');
      return value / q; // KZT per 1 MYR
    }
  }
  throw new Error('MYR not found in NBK response');
}
