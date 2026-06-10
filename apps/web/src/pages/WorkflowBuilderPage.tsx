import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { createWorkflowNode, createWorkflowSnapshot, getWorkflow, listWorkflows, updateWorkflowNode, type Workflow, type WorkflowNode } from '../features/workflows/api';
import { CreateSnapshotDialog } from '../features/workflows/components/CreateSnapshotDialog';
import { WorkflowCanvas } from '../features/workflows/components/WorkflowCanvas';
import { WorkflowNodeConfigPanel } from '../features/workflows/components/WorkflowNodeConfigPanel';

export function WorkflowBuilderPage() {
  const { projectId, workflowId } = useParams();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode>();
  const [message, setMessage] = useState('');

  async function load() {
    if (!projectId) return;
    const response = await listWorkflows(projectId);
    setWorkflows(response.items);
    const targetId = workflowId ?? response.items[0]?.id;
    if (targetId) setWorkflow(await getWorkflow(targetId));
  }

  useEffect(() => {
    void load();
  }, [projectId, workflowId]);

  async function addNode() {
    if (!workflow) return;
    await createWorkflowNode(workflow.id, {
      name: `Node ${workflow.nodes.length + 1}`,
      type: 'agent',
      agentVersionId: workflow.nodes[0]?.agentVersionId,
      inputMapping: { source: 'workflow_input', path: '$.text', target: 'text' },
      outputKey: `node_${workflow.nodes.length + 1}`,
      allowManualEdit: true,
      failurePolicy: 'stop',
      enabled: true
    });
    setWorkflow(await getWorkflow(workflow.id));
  }

  async function saveNode(patch: Record<string, unknown>) {
    if (!selectedNode || !workflow) return;
    await updateWorkflowNode(selectedNode.id, patch);
    setWorkflow(await getWorkflow(workflow.id));
    setMessage('Node saved.');
  }

  async function snapshot() {
    if (!workflow) return;
    await createWorkflowSnapshot(workflow.id, `snapshot-${Date.now()}`);
    setMessage('Snapshot created.');
  }

  return (
    <main className="studio-shell">
      <aside className="agent-list">
        {workflows.map((item) => (
          <button className="agent-list-item" key={item.id} type="button" onClick={() => setWorkflow(item)}>
            {item.name}
          </button>
        ))}
      </aside>
      <section className="studio-main">
        <header className="studio-header">
          <h1>{workflow?.name ?? 'Workflow Builder'}</h1>
          <div className="tabs">
            <button type="button" onClick={addNode}>
              Add Node
            </button>
            <CreateSnapshotDialog onCreate={snapshot} />
          </div>
        </header>
        {workflow ? <WorkflowCanvas nodes={workflow.nodes} onSelectNode={setSelectedNode} /> : null}
        {message ? <p className="message">{message}</p> : null}
      </section>
      <aside className="studio-side">
        <WorkflowNodeConfigPanel node={selectedNode} onSave={saveNode} />
      </aside>
    </main>
  );
}
