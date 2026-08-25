export interface Legend {
  shape: "line" | "square";
  color: string;
  label: string;
  symbol?: "solid" | "diagonal-stripe";
  value?: string;
  onClick?: (legend: Legend) => void;
}

export interface Node {
  id: number;
  name: string;
}

export interface Link {
  source: number;
  target: number;
  value: number;
}

export interface Graph {
  nodes: Node[];
  links: Link[];
}
