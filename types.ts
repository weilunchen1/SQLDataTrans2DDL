
export enum SqlOperation {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  UPSERT = 'UPSERT'
}

export interface ParsedData {
  headers: string[];
  rows: string[][];
}

export interface GenerationSettings {
  tableName: string;
  operation: SqlOperation;
  primaryKey: string;
  identityInsert: boolean;
}

export interface GeminiAnalysisResult {
  suggestedTableName: string;
  dataCleanupSuggestions: string[];
  columnTypes: {
    columnName: string;
    sqlType: string;
  }[];
}
