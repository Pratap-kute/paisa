export interface FlowNode {
  id: number;
  name: string;
  label: string;
  group: string;
  value: number;
  color: string;
}

export interface FlowLink {
  source: number;
  target: number;
  sourceName: string;
  targetName: string;
  value: number;
  cycle: boolean;
}
