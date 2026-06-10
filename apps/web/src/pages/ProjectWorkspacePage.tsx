import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';

interface ProjectDetail {
  id: string;
  name: string;
  description?: string;
  agents: Array<{ id: string; name: string }>;
  workflows: Array<{ id: string; name: string; nodes: Array<{ id: string }> }>;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('agents_os_access_token');
  return token ? { authorization: `Bearer ${token}` } : {};
}

export function ProjectWorkspacePage() {
  const { projectId } = useParams();
  const [project, setProject] = useState<ProjectDetail | null>(null);

  useEffect(() => {
    async function loadProject() {
      const response = await fetch(`${apiBase}/api/projects/${projectId}`, {
        headers: authHeaders()
      });

      if (response.ok) {
        const body = await response.json();
        setProject(body.data);
      }
    }

    void loadProject();
  }, [projectId]);

  if (!project) {
    return <main className="workspace">Loading project...</main>;
  }

  return (
    <main className="workspace">
      <section className="page-header">
        <div>
          <Link to="/projects">Back to projects</Link>
          <h1>{project.name}</h1>
          <p>{project.description ?? '项目工作区'}</p>
        </div>
      </section>

      <section className="metrics">
        <div>
          <span>{project.agents.length}</span>
          <p>Agents</p>
        </div>
        <div>
          <span>{project.workflows.length}</span>
          <p>Workflows</p>
        </div>
        <div>
          <span>0</span>
          <p>Recent Runs</p>
        </div>
      </section>

      <section className="band">
        <h2>Workspace</h2>
        <div className="workspace-links">
          <Link to={`/projects/${project.id}/agents`}>Agent Studio</Link>
          <Link to={`/projects/${project.id}/evaluations`}>Evaluation Lab</Link>
          <Link to={`/projects/${project.id}/workflows`}>Workflow Builder</Link>
          <Link to="/app/story-material-demo">Published App</Link>
        </div>
      </section>

      <section className="band">
        <h2>Default Workflow</h2>
        <div className="table-list">
          {project.workflows.map((workflow) => (
            <div className="row" key={workflow.id}>
              <span>{workflow.name}</span>
              <span>{workflow.nodes.length} nodes</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
