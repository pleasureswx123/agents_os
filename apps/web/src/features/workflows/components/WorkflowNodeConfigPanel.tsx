import { FormEvent, useState } from 'react';
import type { WorkflowNode } from '../api';

interface WorkflowNodeConfigPanelProps {
  node?: WorkflowNode;
  onSave: (patch: Record<string, unknown>) => void;
}

export function WorkflowNodeConfigPanel({ node, onSave }: WorkflowNodeConfigPanelProps) {
  const [outputKey, setOutputKey] = useState(node?.outputKey ?? '');

  if (!node) {
    return <p className="message">Select a node to edit configuration.</p>;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({ outputKey });
  }

  return (
    <form className="panel-stack" onSubmit={submit}>
      <strong>{node.name}</strong>
      <label>
        Output Key
        <input aria-label="Output Key" value={outputKey} onChange={(event) => setOutputKey(event.target.value)} />
      </label>
      <button type="submit">Save Node</button>
    </form>
  );
}
