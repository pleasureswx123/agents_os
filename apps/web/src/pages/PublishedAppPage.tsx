import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  exportPublishedRun,
  getArtifactDownloadUrl,
  getPublishedApp,
  getPublishedRun,
  runPublishedApp,
  type PublishedApp,
  type PublicRun
} from '../features/published-apps/api';
import { connectRunSocket } from '../features/workflow-runs/socket';

export function PublishedAppPage() {
  const { slug } = useParams();
  const [app, setApp] = useState<PublishedApp | null>(null);
  const [text, setText] = useState('');
  const [run, setRun] = useState<PublicRun | null>(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!slug) return;
    void getPublishedApp(slug).then(setApp);
  }, [slug]);

  useEffect(() => {
    if (!slug || !run?.id) return undefined;
    const socket = connectRunSocket(run.id, async (eventName) => {
      setMessage(`Run update: ${eventName}`);
      const current = await getPublishedRun(slug, run.id);
      setRun(current);
      if (current.artifacts[0]) {
        const download = await getArtifactDownloadUrl(slug, current.artifacts[0].id);
        setDownloadUrl(download.url);
      }
    });
    return () => {
      socket.close();
    };
  }, [run?.id, slug]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!slug) return;
    setMessage('Queued');
    const created = await runPublishedApp(slug, { text });
    setRun({ id: created.workflowRunId, status: created.status, artifacts: [] });
    setMessage('Run queued.');
  }

  async function refresh() {
    if (!slug || !run) return;
    const current = await getPublishedRun(slug, run.id);
    setRun(current);
    setMessage(`Run ${current.status}.`);
    if (current.artifacts[0]) {
      const download = await getArtifactDownloadUrl(slug, current.artifacts[0].id);
      setDownloadUrl(download.url);
    }
  }

  async function exportPackage() {
    if (!slug || !run) return;
    setMessage('Exporting package.');
    const artifact = await exportPublishedRun(slug, run.id);
    const current = await getPublishedRun(slug, run.id);
    setRun(current);
    const download = await getArtifactDownloadUrl(slug, artifact.id);
    setDownloadUrl(download.url);
    setMessage('Package ready.');
  }

  if (!app) return <main className="public-app">Loading...</main>;

  return (
    <main className="public-app">
      <section className="public-panel">
        <header>
          <h1>{app.name}</h1>
          <p>{app.description ?? '生成小说/故事视频素材包'}</p>
        </header>
        <form className="panel-stack" onSubmit={submit}>
          <label>
            Story text
            <textarea value={text} onChange={(event) => setText(event.target.value)} required />
          </label>
          <button type="submit">Run App</button>
        </form>
        {run ? (
          <div className="output-box">
            <p>Status: {run.status}</p>
            <button type="button" onClick={refresh}>
              Refresh
            </button>
            <button type="button" disabled={run.status !== 'succeeded'} onClick={exportPackage}>
              Export package
            </button>
            {downloadUrl ? (
              <a className="download-link" href={downloadUrl}>
                Download package
              </a>
            ) : null}
          </div>
        ) : null}
        {message ? <p className="message">{message}</p> : null}
      </section>
    </main>
  );
}
