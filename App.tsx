
import React, { useState, useMemo } from 'react';
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
import { parsePastedData, generateSql } from './services/sqlGenerator';
import { SqlOperation, GenerationSettings } from './types';

export default function App() {
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
    // Auto-detect primary key if empty
    if (data.headers.length > 0 && !settings.primaryKey) {
      const pk = data.headers.find(h => h.toLowerCase().includes('_id') || h.toLowerCase() === 'id');
      if (pk) setSettings(s => ({ ...s, primaryKey: pk }));
    }
    return data;
  }, [rawInput]);

  const generatedSql = useMemo(() => generateSql(parsedData, settings), [parsedData, settings]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedSql);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const handleClear = () => {
    setRawInput('');
    setSettings(s => ({ ...s, primaryKey: '' }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      {/* Header */}
      <header className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
              <CommandLineIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
              SQL Transmuter
            </h1>
          </div>
          <div className="text-xs text-slate-500 font-medium bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
            Client-Side Only • Secure
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input and Settings */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Input Section */}
            <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center space-x-2">
                  <TableCellsIcon className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-300">貼入 SQL 複製的資料</span>
                </div>
                <button 
                  onClick={handleClear}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                  title="清除資料"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="在此貼上 SSMS 或 DBeaver 複製出的結果..."
                className="w-full h-80 p-4 text-sm code-font bg-slate-900 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none border-none placeholder-slate-600"
              />
              <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 uppercase font-bold flex justify-between">
                <span>偵測到: {parsedData.rows.length} 筆資料</span>
                <span>自動偵測分隔符 (Tab/Comma)</span>
              </div>
            </div>

            {/* Settings Section */}
            <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-6 space-y-6">
              <div className="flex items-center space-x-2 mb-2">
                <Cog6ToothIcon className="w-5 h-5 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-300">轉換設定</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">目標資料表名稱</label>
                  <input 
                    type="text" 
                    value={settings.tableName}
                    onChange={(e) => setSettings(prev => ({ ...prev, tableName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">主鍵欄位 (Update 用)</label>
                  <input 
                    type="text" 
                    value={settings.primaryKey}
                    placeholder="例如: ShopEtlFlow_Id"
                    onChange={(e) => setSettings(prev => ({ ...prev, primaryKey: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">SQL 動作</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.values(SqlOperation).map((op) => (
                    <button
                      key={op}
                      onClick={() => setSettings(prev => ({ ...prev, operation: op }))}
                      className={`px-3 py-2 text-xs font-bold rounded-lg transition-all border ${
                        settings.operation === op 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/30' 
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

              {/* IDENTITY_INSERT Toggle with Explanation */}
              <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-slate-300">IDENTITY_INSERT</span>
                    <div className="group relative">
                      <InformationCircleIcon className="w-4 h-4 text-slate-500 cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-[11px] text-slate-300 rounded-lg shadow-xl border border-slate-700 hidden group-hover:block z-20 leading-relaxed">
                        <p className="font-bold text-indigo-400 mb-1">何時該開啟？</p>
                        當您的資料包含「自增 ID」欄位（如 ShopEtlFlow_Id）且您想手動指定該 ID 值時，請開啟此項。系統會自動在腳本前後加入 SET IDENTITY_INSERT 指令。
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, identityInsert: !prev.identityInsert }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.identityInsert ? 'bg-indigo-600' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.identityInsert ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Hint Card */}
            <div className="bg-indigo-500/5 rounded-2xl border border-indigo-500/10 p-4">
              <div className="flex items-start space-x-3">
                <Square3Stack3DIcon className="w-5 h-5 text-indigo-400 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-indigo-300 uppercase mb-1">使用提醒</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    本工具完全在您的瀏覽器中運行，不會將任何資料傳輸到伺服器。支援數千筆資料轉換，適合本地開發與除錯。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Generated Output */}
          <div className="lg:col-span-7 flex flex-col h-[calc(100vh-10rem)] sticky top-24">
            <div className="bg-slate-900 rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden border border-slate-800">
              <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1.5">
                    <div className="w-3 h-3 rounded-full bg-slate-700" />
                    <div className="w-3 h-3 rounded-full bg-slate-700" />
                    <div className="w-3 h-3 rounded-full bg-slate-700" />
                  </div>
                  <span className="ml-4 text-xs font-mono text-slate-500">generated_output.sql</span>
                </div>
                <button 
                  onClick={handleCopy}
                  className={`flex items-center px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    copyFeedback 
                      ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
                  }`}
                >
                  {copyFeedback ? (
                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                  ) : (
                    <ClipboardDocumentIcon className="w-4 h-4 mr-2" />
                  )}
                  {copyFeedback ? '已複製!' : '複製 SQL'}
                </button>
              </div>
              
              <div className="flex-1 p-6 overflow-auto bg-slate-950/30">
                <pre className="text-sm code-font text-indigo-200/90 leading-relaxed whitespace-pre selection:bg-indigo-500/30">
                  {generatedSql || '-- 等待輸入資料中...'}
                </pre>
              </div>

              <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-[10px] uppercase font-bold text-slate-600 tracking-widest">
                <span>SQL Server Syntax (Compatible)</span>
                <span>{generatedSql ? generatedSql.split('\n').length : 0} lines</span>
              </div>
            </div>
          </div>

        </div>
      </main>
      
      <footer className="max-w-7xl mx-auto px-4 mt-12 text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest">
        <p>&copy; 2024 SQL Data Transmuter • Built for Performance & Privacy</p>
      </footer>
    </div>
  );
}
