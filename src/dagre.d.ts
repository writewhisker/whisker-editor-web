declare module 'dagre' {
  export interface GraphLabel {
    width?: number;
    height?: number;
    rankdir?: 'TB' | 'BT' | 'LR' | 'RL';
    align?: 'UL' | 'UR' | 'DL' | 'DR';
    nodesep?: number;
    edgesep?: number;
    ranksep?: number;
    marginx?: number;
    marginy?: number;
    acyclicer?: 'greedy' | undefined;
    ranker?: 'network-simplex' | 'tight-tree' | 'longest-path';
  }

  export interface Node {
    width: number;
    height: number;
    x?: number;
    y?: number;
    [key: string]: any;
  }

  export interface Edge {
    points?: Array<{ x: number; y: number }>;
    [key: string]: any;
  }

  export class graphlib {
    static Graph: typeof Graph;
  }

  export class Graph<T = any> {
    constructor(options?: { directed?: boolean; multigraph?: boolean; compound?: boolean });
    setGraph(label: GraphLabel): Graph<T>;
    setDefaultEdgeLabel(callback: () => Edge): Graph<T>;
    setNode(id: string, node: Node): Graph<T>;
    setEdge(sourceId: string, targetId: string, edge?: Edge): Graph<T>;
    node(id: string): Node & { x: number; y: number };
    edge(sourceId: string, targetId: string): Edge;
    nodes(): string[];
    edges(): Array<{ v: string; w: string }>;
    graph(): GraphLabel;
  }

  export function layout(graph: Graph): void;
}
