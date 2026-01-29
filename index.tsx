
import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  ClipboardDocumentIcon, 
  TrashIcon, 
  CheckCircleIcon,
  CommandLineIcon,
  TableCellsIcon,
  Cog6ToothIcon,
  Square3Stack3DIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { GoogleGenAI, Type } from "@google/genai";

// --- 1. Types & Enums ---
enum SqlOperation {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  UPSERT = 'UPSERT'
}

interface ParsedData {
  headers: string[];
  rows: string[][];
}

interface GenerationSettings {
  tableName: string;
  operation: SqlOperation;
  primaryKey: string;
  identityInsert: boolean;
}

// --- 2. Utils & SQL Generator ---
const parsePastedData = (input: string): ParsedData => {
  if (!input.trim()) return { headers: [], rows: [] };
  const lines = input.trim().split(/\r?\n/);
  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount >= commaCount ? '\t' : ',';
  const headers = lines[0].split(delimiter).map(h => h.trim());
  const rows = lines.slice(1).map(line => line.split(delimiter).map(cell => cell.trim()));
  return { headers, rows };
};

const escapeSqlValue = (val: string): string => {
  if (val === undefined || val === null || val === '') return 'NULL';
  if (!isNaN(Number(val)) && val.trim() !== '' && !val.includes('-')) return val; // 簡單數字判斷
  if (val.startsWith('0x')) return val;
  return `'${val.replace(/'/g, "''")}'`;
};

const generateSql = (data: ParsedData, settings: GenerationSettings): string => {
  const { tableName, operation, primaryKey, identityInsert } = settings;
  const { headers, rows } = data;
  if (!headers.length || !rows.length) return '-- 等待輸入資料中...';

  let sql = '';
  if (identityInsert) sql += `SET IDENTITY_INSERT [${tableName}] ON;\n\n`;

  if (operation === SqlOperation.INSERT) {
    const colList = headers.map(h => `[${h}]`).join(', ');
    rows.forEach(row => {
      const values = row.map(cell => escapeSqlValue(cell)).join(', ');
      sql += `INSERT INTO [${tableName}] (${colList}) VALUES (${values});\n`;
    });
  } else if (operation === SqlOperation.UPDATE) {
    if (!primaryKey) return '-- 請指定主鍵欄位以生成 UPDATE 語句';
    const pkIndex = headers.findIndex(h => h.toLowerCase() === primaryKey.toLowerCase());
    if (pkIndex === -1) return `-- 找不到主鍵欄位 [${primaryKey}]`;
    rows.forEach(row => {
      const sets = headers.map((h, i) => i === pkIndex ? null : `[${h}] = ${escapeSqlValue(row[i])}`).filter(Boolean).join(', ');
      sql += `UPDATE [${tableName}] SET ${sets} WHERE [${primaryKey}] = ${escapeSqlValue(row[pkIndex])};\n`;
    });
  } else {
    sql += `-- 目前僅支援 INSERT 與 UPDATE 轉換`;
  }

  if (identityInsert) sql += `\nSET IDENTITY_INSERT [${tableName}] OFF;`;
  return sql;
};

// --- 3. Main App Component ---
function App() {
  const [rawInput, setRawInput] = useState('');
  const [settings, setSettings] = useState<GenerationSettings>({
    tableName: 'TargetTable',
    operation: SqlOperation.INSERT,
    primaryKey: '',
    identityInsert: false,
  });
  const [copyFeedback, setCopyFeedback] = useState(false);

  const parsedData = useMemo(() => {
    const data = parsePastedData(rawInput);
    if (data.headers.length > 0 && !settings.primaryKey) {
      const pk = data.headers.find(h => h.toLowerCase().includes('_id') || h.toLowerCase() === 'id');
      if (pk) setSettings(s => ({ ...s, primaryKey: pk }));
    }
    return data;
  }, [rawInput]);

  const generatedSql = useMemo(() => generateSql(parsedData, settings), [parsedData, settings]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedSql);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      <header className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CommandLineIcon className="w-6 h-6 text-indigo-500" />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">SQL Transmuter</h1>
          </div>
          <div className="text-[10px] bg-slate-800 px-3 py-1 rounded-full border border-slate-700 text-slate-500 uppercase font-bold tracking-widest">No-Build Edition</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <span className="text-sm font-bold text-slate-400 flex items-center"><TableCellsIcon className="w-4 h-4 mr-2" />輸入資料</span>
              <button onClick={() => setRawInput('')} className="p-1 text-slate-500 hover:text-red-400 transition-colors"><TrashIcon className="w-4 h-4" /></button>
            </div>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              className="w-full h-80 p-4 text-sm code-font bg-transparent focus:outline-none text-indigo-100 placeholder-slate-700 resize-none"
              placeholder="貼上 SSMS 或 Excel 資料..."
            />
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-400 flex items-center"><Cog6ToothIcon className="w-4 h-4 mr-2" />轉換設定</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">目標資料表</label>
                <input type="text" value={settings.tableName} onChange={e => setSettings(s => ({ ...s, tableName: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">主鍵欄位</label>
                <input type="text" value={settings.primaryKey} onChange={e => setSettings(s => ({ ...s, primaryKey: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
            <div className="flex space-x-2">
              {[SqlOperation.INSERT, SqlOperation.UPDATE].map(op => (
                <button key={op} onClick={() => setSettings(s => ({ ...s, operation: op }))} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${settings.operation === op ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>{op}</button>
              ))}
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-400">IDENTITY_INSERT</span>
              <button onClick={() => setSettings(s => ({ ...s, identityInsert: !s.identityInsert }))} className={`w-10 h-5 rounded-full relative transition-colors ${settings.identityInsert ? 'bg-indigo-600' : 'bg-slate-700'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.identityInsert ? 'left-6' : 'left-1'}`} /></button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 h-[calc(100vh-10rem)] sticky top-24">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">output.sql</span>
              <button onClick={handleCopy} className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center transition-all ${copyFeedback ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                {copyFeedback ? <CheckCircleIcon className="w-4 h-4 mr-2" /> : <ClipboardDocumentIcon className="w-4 h-4 mr-2" />}
                {copyFeedback ? '已複製' : '複製'}
              </button>
            </div>
            <div className="flex-1 p-6 overflow-auto bg-slate-950/20 font-mono text-sm leading-relaxed text-indigo-200/80">
              <pre className="whitespace-pre-wrap">{generatedSql}</pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
