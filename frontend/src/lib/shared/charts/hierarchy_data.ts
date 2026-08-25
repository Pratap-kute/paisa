export interface FinancialHierarchyNode {
  id: string;
  label: string;
  value: number;
  percentage?: number;
  categoryKey?: string;
  metadata?: Record<string, string | number | undefined>;
  children?: FinancialHierarchyNode[];
}
