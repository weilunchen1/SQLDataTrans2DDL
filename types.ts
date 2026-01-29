
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

// Added missing interface for Gemini data analysis results
export interface ColumnTypeSuggestion {
  columnName: string;
  sqlType: string;
}

export interface GeminiAnalysisResult {
  suggestedTableName: string;
  dataCleanupSuggestions: string[];
  columnTypes: ColumnTypeSuggestion[];
}
