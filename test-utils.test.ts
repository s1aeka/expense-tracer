import {describe, it, expect} from 'vitest';
import {computeTotals} from './server';

describe('totals', ()=>{
  it('sums two expenses with different rates', ()=>{
    const rows = [
      {amount:10, currency:'MYR', kzt_per_myr:100, created_at: new Date().toISOString(), category:'Еда вне дома'},
      {amount:2000, currency:'KZT', kzt_per_myr:125, created_at: new Date().toISOString(), category:'Такси'}
    ];
    const totals = computeTotals(rows);
    // first: 10 MYR -> 1000 KZT; second: 2000 KZT -> 16 MYR (2000/125)
    expect(Math.round(totals.today.kzt)).toBe(3000);
    expect(Math.round(totals.today.myr)).toBe(26);
  });

  it('keeps totals by month and today separate when dates differ', ()=>{
    const now = new Date();
    const yesterday = new Date(Date.now() - 24*3600*1000).toISOString();
    const rows = [
      {amount:10, currency:'MYR', kzt_per_myr:100, created_at: now.toISOString(), category:'Еда вне дома'},
      {amount:5, currency:'MYR', kzt_per_myr:100, created_at: yesterday, category:'Еда вне дома'}
    ];
    const totals = computeTotals(rows);
    expect(totals.today.kzt).toBe(10*100);
    // month includes both
    expect(totals.month.kzt).toBe(15*100);
  });
});
