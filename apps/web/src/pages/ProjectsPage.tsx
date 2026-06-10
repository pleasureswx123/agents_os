import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';

interface TemplateItem {
  id: string;
  name: string;
  description?: string;
  latestVersionId: string;
}

interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  _count?: {
    agents: number;
    workflows: number;
  };
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('agents_os_access_token');
  return token ? { authorization: `Bearer ${token}` } : {};
}

export function ProjectsPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedTemplateVersionId, setSelectedTemplateVersionId] = useState('');
  const [projectName, setProjectName] = useState('我的小说素材生产项目');
  const [message, setMessage] = useState('');

  async function loadData() {
    const [templatesResponse, projectsResponse] = await Promise.all([
      fetch(`${apiBase}/api/templates`, { headers: authHeaders() }),
      fetch(`${apiBase}/api/projects`, { headers: authHeaders() })
    ]);

    if (templatesResponse.ok) {
      const body = await templatesResponse.json();
      setTemplates(body.data.items);
      setSelectedTemplateVersionId((current) => current || body.data.items[0]?.latestVersionId || '');
    }

    if (projectsResponse.ok) {
      const body = await projectsResponse.json();
      setProjects(body.data.items);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createProject(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    const response = await fetch(`${apiBase}/api/projects`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({
        name: projectName,
        templateVersionId: selectedTemplateVersionId
      })
    });

    if (!response.ok) {
      setMessage('项目创建失败，请确认已登录并完成 seed。');
      return;
    }

    setMessage('项目已创建。');
    await loadData();
  }

  return (
    <main className="workspace">
      <section className="page-header">
        <div>
          <h1>Projects</h1>
          <p>基于 TemplateVersion 创建和管理智能体工厂项目。</p>
        </div>
      </section>

      <section className="band">
        <h2>System Templates</h2>
        <form className="inline-form" onSubmit={createProject}>
          <select value={selectedTemplateVersionId} onChange={(event) => setSelectedTemplateVersionId(event.target.value)}>
            {templates.map((template) => (
              <option key={template.id} value={template.latestVersionId}>
                {template.name}
              </option>
            ))}
          </select>
          <input value={projectName} onChange={(event) => setProjectName(event.target.value)} />
          <button type="submit">Create Project</button>
        </form>
        {message ? <p className="message">{message}</p> : null}
      </section>

      <section className="band">
        <h2>Project List</h2>
        <div className="table-list">
          {projects.map((project) => (
            <Link className="row" key={project.id} to={`/projects/${project.id}`}>
              <span>{project.name}</span>
              <span>{project._count?.agents ?? 0} agents</span>
              <span>{project._count?.workflows ?? 0} workflows</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
