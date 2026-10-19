import express from 'express';
import bodyParser from 'body-parser';
import {DateTime} from 'luxon';
import {TIMEZONE, DEFAULT_CURRENCY, CATEGORIES} from './config';
import {normalizeCurrency, validateParsedExpense, ParsedExpense, validateCategory} from './utils';
import {getRateByDate, saveRate, saveExpense, listExpensesSince, deleteExpense} from './db';
import {fetchKztPerMyrForDate} from './nbk';
import {parseExpenseWithModel} from './llm';

const app = express();
app.use(bodyParser.json());
app.use(express.static('.'));

// helper: today's date in NBK format DD.MM.YYYY according to Asia/Kuala_Lumpur
function todayForNbk(){
  return DateTime.now().setZone(TIMEZONE).toFormat('dd.MM.yyyy');
}

app.post('/api/add', async (req,res) => {
  const {text} = req.body ?? {};
  if(typeof text !== 'string') return res.status(400).json({error:'text required'});

  // call LLM to parse
  let parsed: ParsedExpense;
  try{
    parsed = await parseExpenseWithModel(text);
  }catch(err:any){
    console.error('LLM error', err?.message ?? err);
    return res.status(422).json({error:'не понял, перепиши'});
  }

  // validate parsed result
  if(!validateParsedExpense(parsed)){
    console.error('Parsed invalid', parsed);
    return res.status(422).json({error:'не понял, перепиши'});
  }

  // ensure currency normalized and allowed
  parsed.currency = normalizeCurrency(parsed.currency as string) as ParsedExpense['currency'];
  if(parsed.currency !== 'MYR' && parsed.currency !== 'KZT') return res.status(422).json({error:'не понял, перепиши'});
  if(!validateCategory(parsed.category)) return res.status(422).json({error:'не понял, перепиши'});

  // get rate for today (kzt per 1 myr). If expense is MYR we need this; if KZT we still store KZT-per-MYR so calculations consistent
  const nbkDate = todayForNbk();
  let rate = getRateByDate(nbkDate);
  if(rate == null){
    try{
      rate = await fetchKztPerMyrForDate(nbkDate);
      saveRate(nbkDate, rate);
    }catch(err:any){
      console.error('Failed to obtain rate', err?.message ?? err);
      return res.status(500).json({error:'Курс получить не удалось'});
    }
  }

  const created_at = new Date().toISOString(); // store in UTC
  const id = saveExpense({
    name: parsed.name,
    amount: parsed.amount,
    currency: parsed.currency,
    category: parsed.category,
    created_at,
    kzt_per_myr: rate
  });

  return res.json({id});
});

app.get('/api/expenses/today', (req,res) => {
  const now = DateTime.now().setZone(TIMEZONE);
  const startOfDay = now.startOf('day').toUTC().toISO();
  const rows = listExpensesSince(startOfDay);
  res.json(rows);
});

app.delete('/api/expense/:id', (req,res) => {
  const id = Number(req.params.id);
  if(!Number.isInteger(id)) return res.status(400).json({error:'invalid id'});
  deleteExpense(id);
  res.json({ok:true});
});

// simple totals endpoint for today and month
app.get('/api/totals', (req,res)=>{
  const {allExpenses} = require('./db');
  const rows = allExpenses();
  // totals computed in separate util for testability but inline here for brevity
  const totals = computeTotals(rows);
  res.json(totals);
});

function computeTotals(rows:any[]){
  // each row has amount, currency, kzt_per_myr
  // convert each to KZT and MYR using saved kzt_per_myr
  const now = DateTime.now().setZone(TIMEZONE);
  const startOfDay = now.startOf('day').toUTC();
  const startOfMonth = now.startOf('month').toUTC();

  let totals = {today:{kzt:0,myr:0}, month:{kzt:0,myr:0}, byCategory: new Map<string, {kzt:number,myr:number}>()};
  for(const r of rows){
    const ts = DateTime.fromISO(r.created_at);
    const kztPerMyr = r.kzt_per_myr as number;
    let amountKzt = 0;
    let amountMyr = 0;
    if(r.currency === 'MYR'){
      amountMyr = r.amount;
      amountKzt = r.amount * kztPerMyr;
    }else{
      amountKzt = r.amount;
      amountMyr = r.amount / kztPerMyr;
    }
    const addTo = (target:any)=>{ target.kzt += amountKzt; target.myr += amountMyr };
    if(ts >= startOfDay) addTo(totals.today);
    if(ts >= startOfMonth) addTo(totals.month);
    const cat = r.category ?? 'Прочее';
    if(!totals.byCategory.has(cat)) totals.byCategory.set(cat,{kzt:0,myr:0});
    addTo(totals.byCategory.get(cat));
  }
  // turn Map into object
  const byCatObj: Record<string,{kzt:number,myr:number}> = {};
  for(const [k,v] of totals.byCategory.entries()) byCatObj[k]=v;
  return {today:totals.today, month:totals.month, byCategory:byCatObj};
}

const PORT = 3000;
app.listen(PORT, 'localhost', ()=> console.log(`Listening http://localhost:${PORT}`));

export {computeTotals};
