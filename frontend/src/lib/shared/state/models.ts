export interface AccountTfIdf {
  tf_idf: Record<string, Record<string, number>>;
  index: {
    docs: Record<string, Record<string, number>>;
    tokens: Record<string, Record<string, number>>;
  };
}

export interface SheetLineResult {
  line: number;
  result: string;
  error: boolean;
  underline?: boolean;
  bold?: boolean;
  align?: "left" | "right";
}
