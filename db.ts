import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'data.db');
const db = new Database(DB_PATH);

// rates(date TEXT PRIMARY KEY, kzt_per_myr REAL)
db.exec(`
CREATE TABLE IF NOT EXISTS rates (
  date TEXT PRIMARY KEY,
  kzt_per_myr REAL NOT NULL
);
`);

// expenses: id, name, amount, currency, category, created_at (UTC ISO), kzt_per_myr
db.exec(`
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TEXT NOT NULL,
  kzt_per_myr REAL NOT NULL
);
`);

export function getRateByDate(date: string){
  const row = db.prepare('SELECT kzt_per_myr FROM rates WHERE date = ?').get(date);
  return row ? row.kzt_per_myr as number : null;
}

export function saveRate(date: string, kzt_per_myr: number){
  db.prepare('INSERT OR REPLACE INTO rates(date,kzt_per_myr) VALUES(?,?)').run(date, kzt_per_myr);
}

export function saveExpense(expense: {name:string, amount:number, currency:string, category:string, created_at:string, kzt_per_myr:number}){
  const stmt = db.prepare('INSERT INTO expenses(name,amount,currency,category,created_at,kzt_per_myr) VALUES(?,?,?,?,?,?)');
  const info = stmt.run(expense.name, expense.amount, expense.currency, expense.category, expense.created_at, expense.kzt_per_myr);
  return info.lastInsertRowid as number;
}

export function deleteExpense(id:number){
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
}

export function listExpensesSince(isoDate:string){
  return db.prepare('SELECT * FROM expenses WHERE created_at >= ? ORDER BY created_at DESC').all(isoDate);
}

export function allExpenses(){
  return db.prepare('SELECT * FROM expenses ORDER BY created_at DESC').all();
}

export default db;
