import type { Story } from '../models/Story';
import type { Passage } from '../models/Passage';

export interface FlowPathNode {
  passageId: string;
  passageTitle: string;
  depth: number;
  children: FlowPathNode[];
}

export interface PathAnalysis {
  path: string[]; // Array of passage IDs
  length: number;
  isDeadEnd: boolean;
  isCircular: boolean;
}

export interface BottleneckAnalysis {
  passageId: string;
  passageTitle: string;
  incomingCount: number; // Number of passages leading to this
  outgoingCount: number; // Number of choices from this
  bottleneckScore: number; // Ratio indicating bottleneck severity
}

export interface StoryFlowMetrics {
  totalPaths: number;
  averagePathLength: number;
  longestPath: PathAnalysis | null;
  shortestPath: PathAnalysis | null;
  deadEnds: string[]; // Passage IDs with no outgoing choices
  bottlenecks: BottleneckAnalysis[];
  circularPaths: PathAnalysis[];
  unreachablePassages: string[];
  flowTree: FlowPathNode | null;
}

/**
 * Analyzes story flow and provides metrics
 */
export class StoryFlowAnalyzer {
  private story: Story;
  private incomingConnections: Map<string, Set<string>>; // passageId -> Set of source passage IDs
  private outgoingConnections: Map<string, Set<string>>; // passageId -> Set of target passage IDs

  constructor(story: Story) {
    this.story = story;
    this.incomingConnections = new Map();
    this.outgoingConnections = new Map();
    this.buildConnectionMaps();
  }

  /**
   * Build maps of incoming and outgoing connections
   */
  private buildConnectionMaps(): void {
    this.story.passages.forEach((passage) => {
      if (!this.outgoingConnections.has(passage.id)) {
        this.outgoingConnections.set(passage.id, new Set());
      }

      passage.choices.forEach((choice) => {
        if (choice.target) {
          // Add outgoing connection
          this.outgoingConnections.get(passage.id)!.add(choice.target);

          // Add incoming connection
          if (!this.incomingConnections.has(choice.target)) {
            this.incomingConnections.set(choice.target, new Set());
          }
          this.incomingConnections.get(choice.target)!.add(passage.id);

          // Ensure target exists in outgoing map
          if (!this.outgoingConnections.has(choice.target)) {
            this.outgoingConnections.set(choice.target, new Set());
          }
        }
      });
    });
  }

  /**
   * Find all possible paths from a starting passage
   */
  private findPaths(
    startId: string,
    visited: Set<string> = new Set(),
    currentPath: string[] = []
  ): PathAnalysis[] {
    const paths: PathAnalysis[] = [];
    const newPath = [...currentPath, startId];

    // Check for circular reference
    if (visited.has(startId)) {
      paths.push({
        path: newPath,
        length: newPath.length,
        isDeadEnd: false,
        isCircular: true,
      });
      return paths;
    }

    const newVisited = new Set(visited);
    newVisited.add(startId);

    const outgoing = this.outgoingConnections.get(startId);

    // Dead end - no outgoing connections
    if (!outgoing || outgoing.size === 0) {
      paths.push({
        path: newPath,
        length: newPath.length,
        isDeadEnd: true,
        isCircular: false,
      });
      return paths;
    }

    // Recursively explore each outgoing connection
    outgoing.forEach((targetId) => {
      const subPaths = this.findPaths(targetId, newVisited, newPath);
      paths.push(...subPaths);
    });

    return paths;
  }

  /**
   * Build a tree representation of the story flow
   */
  private buildFlowTree(
    passageId: string,
    visited: Set<string> = new Set(),
    depth: number = 0
  ): FlowPathNode | null {
    if (visited.has(passageId) || depth > 100) {
      // Prevent infinite loops and excessive depth
      return null;
    }

    const passage = this.story.getPassage(passageId);
    if (!passage) return null;

    const newVisited = new Set(visited);
    newVisited.add(passageId);

    const node: FlowPathNode = {
      passageId: passage.id,
      passageTitle: passage.title,
      depth,
      children: [],
    };

    const outgoing = this.outgoingConnections.get(passageId);
    if (outgoing) {
      outgoing.forEach((targetId) => {
        const childNode = this.buildFlowTree(targetId, newVisited, depth + 1);
        if (childNode) {
          node.children.push(childNode);
        }
      });
    }

    return node;
  }

  /**
   * Find unreachable passages (not connected from start)
   */
  private findUnreachablePassages(startPassageId: string): string[] {
    const reachable = new Set<string>();
    const queue: string[] = [startPassageId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;

      reachable.add(current);

      const outgoing = this.outgoingConnections.get(current);
      if (outgoing) {
        outgoing.forEach((targetId) => {
          if (!reachable.has(targetId)) {
            queue.push(targetId);
          }
        });
      }
    }

    const unreachable: string[] = [];
    this.story.passages.forEach((passage) => {
      if (!reachable.has(passage.id)) {
        unreachable.push(passage.id);
      }
    });

    return unreachable;
  }

  /**
   * Identify bottlenecks in the story flow
   */
  private findBottlenecks(): BottleneckAnalysis[] {
    const bottlenecks: BottleneckAnalysis[] = [];

    this.story.passages.forEach((passage) => {
      const incomingCount = this.incomingConnections.get(passage.id)?.size || 0;
      const outgoingCount = this.outgoingConnections.get(passage.id)?.size || 0;

      // A bottleneck is a passage with many incoming but few outgoing connections
      // Or vice versa (expansion point)
      if (incomingCount > 0 || outgoingCount > 0) {
        const bottleneckScore =
          outgoingCount > 0 ? incomingCount / outgoingCount : incomingCount;

        bottlenecks.push({
          passageId: passage.id,
          passageTitle: passage.title,
          incomingCount,
          outgoingCount,
          bottleneckScore,
        });
      }
    });

    // Sort by bottleneck score descending
    return bottlenecks.sort((a, b) => b.bottleneckScore - a.bottleneckScore);
  }

  /**
   * Analyze the story flow and return comprehensive metrics
   */
  analyze(): StoryFlowMetrics {
    const startPassageId = this.story.metadata.startPassage;
    if (!startPassageId) {
      return {
        totalPaths: 0,
        averagePathLength: 0,
        longestPath: null,
        shortestPath: null,
        deadEnds: [],
        bottlenecks: [],
        circularPaths: [],
        unreachablePassages: [],
        flowTree: null,
      };
    }

    // Find all paths from start
    const allPaths = this.findPaths(startPassageId);

    // Separate circular paths from regular paths
    const circularPaths = allPaths.filter((p) => p.isCircular);
    const regularPaths = allPaths.filter((p) => !p.isCircular);

    // Find longest and shortest paths
    let longestPath: PathAnalysis | null = null;
    let shortestPath: PathAnalysis | null = null;

    regularPaths.forEach((path) => {
      if (!longestPath || path.length > longestPath.length) {
        longestPath = path;
      }
      if (!shortestPath || path.length < shortestPath.length) {
        shortestPath = path;
      }
    });

    // Calculate average path length
    const totalLength = regularPaths.reduce((sum, path) => sum + path.length, 0);
    const averagePathLength = regularPaths.length > 0 ? totalLength / regularPaths.length : 0;

    // Find dead ends
    const deadEnds: string[] = [];
    this.story.passages.forEach((passage) => {
      const outgoing = this.outgoingConnections.get(passage.id);
      if (!outgoing || outgoing.size === 0) {
        deadEnds.push(passage.id);
      }
    });

    // Find bottlenecks
    const bottlenecks = this.findBottlenecks();

    // Find unreachable passages
    const unreachablePassages = this.findUnreachablePassages(startPassageId);

    // Build flow tree
    const flowTree = this.buildFlowTree(startPassageId);

    return {
      totalPaths: regularPaths.length,
      averagePathLength,
      longestPath,
      shortestPath,
      deadEnds,
      bottlenecks: bottlenecks.slice(0, 10), // Top 10 bottlenecks
      circularPaths,
      unreachablePassages,
      flowTree,
    };
  }
}
