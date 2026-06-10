import { Navigate, Route, Routes } from 'react-router';
import { BrowserRouter } from 'react-router-dom';
import { ProjectWorkspacePage } from '../pages/ProjectWorkspacePage';
import { AgentStudioPage } from '../pages/AgentStudioPage';
import { EvaluationLabPage } from '../pages/EvaluationLabPage';
import { ProjectsPage } from '../pages/ProjectsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectWorkspacePage />} />
        <Route path="/projects/:projectId/agents" element={<AgentStudioPage />} />
        <Route path="/projects/:projectId/agents/:agentId" element={<AgentStudioPage />} />
        <Route path="/projects/:projectId/evaluations/:agentId?" element={<EvaluationLabPage />} />
      </Routes>
    </BrowserRouter>
  );
}
