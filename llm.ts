import {Anthropic} from '@anthropic-ai/sdk';
import {MODEL} from './config';
import {ParsedExpense} from './utils';

const key = process.env.ANTHROPIC_API_KEY;
if(!key){
  // Do not throw at import time; code calling parseExpense should detect missing key
}

export async function parseExpenseWithModel(text: string): Promise<ParsedExpense> {
  if(!key) throw new Error('Missing ANTHROPIC_API_KEY');
  const client = new Anthropic({apiKey: key});
  // Prompt: ask model to return strict JSON matching fields name, amount, currency, category
  const system = `You must output ONLY a JSON object with keys: name (string), amount (number), currency ("MYR" or "KZT"), category (one of predefined categories). No extra text.`;
  const user = `Parse this single expense line: "${text.replace(/"/g,'\"')}"\nReturn JSON only.`;

  const resp = await client.completions.create({
    model: MODEL,
    prompt: `${system}\n\n${user}`,
    max_tokens: 300,
    temperature: 0
  });
  const out = (resp?.completion ?? '').trim();
  let parsed: any;
  try{
    parsed = JSON.parse(out);
  }catch(e){
    throw new Error('Model returned non-JSON');
  }
  return parsed as ParsedExpense;
}
