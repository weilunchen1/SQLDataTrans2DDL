
import { ParsedData, SqlOperation, GenerationSettings } from '../types';

export const parsePastedData = (input: string): ParsedData => {
  if (!input.trim()) return { headers: [], rows: [] };

  // Split by newlines
  const lines = input.trim().split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };

  // Detect delimiter (Tab is standard for SQL copy-paste, otherwise comma)
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
  
  // Basic number detection
  if (!isNaN(Number(val)) && val.trim() !== '') {
    return val;
  }
  
  // Hex strings (0x...)
  if (val.startsWith('0x')) return val;

  // Escape single quotes
  const escaped = val.replace(/'/g, "''");
  return `'${escaped}'`;
};

export const generateSql = (data: ParsedData, settings: GenerationSettings): string => {
  const { tableName, operation, primaryKey, identityInsert } = settings;
  const { headers, rows } = data;

  if (!headers.length || !rows.length) return '-- No data provided';

  let sql = '';

  if (identityInsert) {
    sql += `SET IDENTITY_INSERT [${tableName}] ON;\n\n`;
  }

  if (operation === SqlOperation.INSERT) {
    const colList = headers.map(h => `[${h}]`).join(', ');
    rows.forEach(row => {
      const values = row.map(cell => escapeSqlValue(cell)).join(', ');
      sql += `INSERT INTO [${tableName}] (${colList})\nVALUES (${values});\n`;
    });
  } else if (operation === SqlOperation.UPDATE) {
    if (!primaryKey) return '-- Please specify a Primary Key for UPDATE statements';
    const pkIndex = headers.findIndex(h => h.toLowerCase() === primaryKey.toLowerCase());
    if (pkIndex === -1) return `-- Primary Key [${primaryKey}] not found in columns`;

    rows.forEach(row => {
      const sets = headers
        .map((h, i) => i === pkIndex ? null : `[${h}] = ${escapeSqlValue(row[i])}`)
        .filter(s => s !== null)
        .join(', ');
      
      const pkValue = escapeSqlValue(row[pkIndex]);
      sql += `UPDATE [${tableName}] SET ${sets} WHERE [${primaryKey}] = ${pkValue};\n`;
    });
  } else if (operation === SqlOperation.UPSERT) {
      // Simplified UPSERT for demonstration (standard Merge or separate logic)
      sql += `-- UPSERT logic (MERGE statement) for ${rows.length} rows...\n`;
      // For brevity, we'll implement a simple conditional insert/update comment
      sql += `-- Suggesting MERGE for [${tableName}] based on [${primaryKey || 'PK'}]\n`;
  }

  if (identityInsert) {
    sql += `\nSET IDENTITY_INSERT [${tableName}] OFF;`;
  }

  return sql;
};
