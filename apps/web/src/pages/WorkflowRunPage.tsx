import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Play, RotateCcw, Save } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../components/ui/dialog';
import {
  continueWorkflowRun,
  exportWorkflowRun,
  getArtifactDownloadUrl,
  getWorkflowRun,
  rerunNodeRun,
  updateNodeRunEditedOutput,
  type WorkflowNodeRun
} from '../features/workflow-runs/api';
import { connectRunSocket } from '../features/workflow-runs/socket';

function formatJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJson(value: string) {
  try {
    return { ok: true as const, value: JSON.parse(value) };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : 'Invalid JSON' };
  }
}

export function WorkflowRunPage() {
  const { runId } = useParams();
  const queryClient = useQueryClient();
  const [selectedNodeRun, setSelectedNodeRun] = useState<WorkflowNodeRun | null>(null);
  const [editorValue, setEditorValue] = useState('{}');
  const [message, setMessage] = useState('');
  const queryKey = ['workflow-run', runId];

  const runQuery = useQuery({
    queryKey,
    queryFn: () => getWorkflowRun(runId ?? ''),
    enabled: Boolean(runId),
    refetchInterval: false
  });

  useEffect(() => {
    if (!runId) return undefined;
    const socket = connectRunSocket(runId, (eventName) => {
      setMessage(`Received ${eventName}`);
      void queryClient.invalidateQueries({ queryKey });
    });
    return () => {
      socket.close();
    };
  }, [queryClient, runId]);

  const waitingNodeRun = useMemo(() => {
    const waitingId = runQuery.data?.controlState?.waitingFor?.workflowNodeRunId;
    return runQuery.data?.nodeRuns.find((nodeRun) => nodeRun.id === waitingId);
  }, [runQuery.data]);

  const saveMutation = useMutation({
    mutationFn: ({ nodeRunId, editedOutput }: { nodeRunId: string; editedOutput: unknown }) =>
      updateNodeRunEditedOutput(runId ?? '', nodeRunId, editedOutput),
    onSuccess: () => {
      setMessage('Edited output saved.');
      void queryClient.invalidateQueries({ queryKey });
    }
  });
  const continueMutation = useMutation({
    mutationFn: () => continueWorkflowRun(runId ?? ''),
    onSuccess: () => {
      setMessage('Continue queued.');
      void queryClient.invalidateQueries({ queryKey });
    }
  });
  const rerunMutation = useMutation({
    mutationFn: (nodeRunId: string) => rerunNodeRun(runId ?? '', nodeRunId),
    onSuccess: () => {
      setMessage('Node rerun queued.');
      void queryClient.invalidateQueries({ queryKey });
    }
  });
  const exportMutation = useMutation({
    mutationFn: () => exportWorkflowRun(runId ?? ''),
    onSuccess: () => {
      setMessage('Artifact export queued.');
      void queryClient.invalidateQueries({ queryKey });
    }
  });

  async function downloadArtifact(artifactId: string) {
    const download = await getArtifactDownloadUrl(artifactId);
    window.location.href = download.url;
  }

  function openEditor(nodeRun: WorkflowNodeRun) {
    setSelectedNodeRun(nodeRun);
    setEditorValue(formatJson(nodeRun.editedOutput ?? nodeRun.output));
  }

  function saveEditedOutput(event: FormEvent) {
    event.preventDefault();
    if (!selectedNodeRun) return;
    const parsed = parseJson(editorValue);
    if (!parsed.ok) {
      setMessage(`JSON parse failed: ${parsed.message}`);
      return;
    }
    saveMutation.mutate({ nodeRunId: selectedNodeRun.id, editedOutput: parsed.value });
  }

  const run = runQuery.data;
  if (runQuery.isLoading) return <main className="studio-shell"><section className="studio-main">Loading...</section></main>;
  if (!run) return <main className="studio-shell"><section className="studio-main">WorkflowRun not found.</section></main>;

  return (
    <main className="studio-shell">
      <aside className="agent-list">
        {run.nodeRuns.map((nodeRun, index) => (
          <button className="agent-list-item" key={nodeRun.id} type="button" onClick={() => openEditor(nodeRun)}>
            <span>{`Node ${index + 1}`}</span>
            <strong>{nodeRun.status}</strong>
          </button>
        ))}
      </aside>
      <section className="studio-main">
        <header className="studio-header">
          <div>
            <h1>Workflow Run</h1>
            <p className="message">Status: {run.status}</p>
          </div>
          <div className="tabs">
            <Button
              disabled={run.status !== 'waiting_for_human_edit' || continueMutation.isPending}
              onClick={() => continueMutation.mutate()}
              type="button"
            >
              <Play size={16} />
              Continue
            </Button>
            <Button
              disabled={run.status !== 'succeeded' || exportMutation.isPending}
              onClick={() => exportMutation.mutate()}
              type="button"
              variant="secondary"
            >
              <Download size={16} />
              Export
            </Button>
          </div>
        </header>
        <div className="run-grid">
          {run.nodeRuns.map((nodeRun) => (
            <article className="run-card" key={nodeRun.id}>
              <header>
                <strong>{nodeRun.workflowNodeId ?? 'Detached node'}</strong>
                <span>{nodeRun.status}</span>
              </header>
              <pre>{formatJson(nodeRun.editedOutput ?? nodeRun.output ?? nodeRun.error)}</pre>
              <div className="tabs">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button onClick={() => openEditor(nodeRun)} type="button" variant="secondary">
                      <Save size={16} />
                      Edit Output
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit node output</DialogTitle>
                      <DialogDescription>Saved JSON becomes the downstream input for the next node.</DialogDescription>
                    </DialogHeader>
                    <form className="panel-stack" onSubmit={saveEditedOutput}>
                      <textarea value={editorValue} onChange={(event) => setEditorValue(event.target.value)} />
                      <Button disabled={saveMutation.isPending} type="submit">
                        Save edited output
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button onClick={() => rerunMutation.mutate(nodeRun.id)} type="button" variant="ghost">
                  <RotateCcw size={16} />
                  Rerun
                </Button>
              </div>
            </article>
          ))}
        </div>
        {waitingNodeRun ? <p className="message">Waiting for review on NodeRun {waitingNodeRun.id}</p> : null}
        {run.errorSummary ? <p className="message">{run.errorSummary}</p> : null}
        {message ? <p className="message">{message}</p> : null}
      </section>
      <aside className="studio-side">
        <h2>Artifacts</h2>
        <div className="panel-stack">
          {run.artifacts.map((artifact) => (
            <Button key={artifact.id} onClick={() => void downloadArtifact(artifact.id)} type="button" variant="secondary">
              <Download size={16} />
              {artifact.filename ?? artifact.type}
            </Button>
          ))}
          {run.artifacts.length === 0 ? <p className="message">No exported package yet.</p> : null}
        </div>
      </aside>
    </main>
  );
}
