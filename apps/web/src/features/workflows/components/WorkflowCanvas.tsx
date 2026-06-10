import { Background, Controls, ReactFlow, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { WorkflowNode } from '../api';

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  onSelectNode: (node: WorkflowNode) => void;
}

export function WorkflowCanvas({ nodes, onSelectNode }: WorkflowCanvasProps) {
  const flowNodes: Node[] = nodes.map((node, index) => ({
    id: node.id,
    position: node.position ?? { x: 120 + index * 240, y: 120 },
    data: { label: node.enabled ? node.name : `${node.name} (disabled)` },
    type: 'default'
  }));

  const enabledNodes = nodes.filter((node) => node.enabled).sort((a, b) => a.orderIndex - b.orderIndex);
  const edges: Edge[] = enabledNodes.slice(1).map((node, index) => ({
    id: `${enabledNodes[index].id}-${node.id}`,
    source: enabledNodes[index].id,
    target: node.id
  }));

  return (
    <div className="flow-canvas">
      <ReactFlow
        nodes={flowNodes}
        edges={edges}
        fitView
        onNodeClick={(_, flowNode) => {
          const selected = nodes.find((node) => node.id === flowNode.id);
          if (selected) onSelectNode(selected);
        }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
