export interface GraphPosition {
  x: number;
  y: number;
}

export interface GraphNodeData {
  id: string;
  label: string;
  position: GraphPosition;
  width?: number;
  height?: number;
  type?: string;
  data?: any;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  data?: any;
}
