import { Navigate, Route, Routes } from 'react-router';
import { BrowserRouter } from 'react-router-dom';
import { ProjectWorkspacePage } from '../pages/ProjectWorkspacePage';
import { AgentStudioPage } from '../pages/AgentStudioPage';
import { EvaluationLabPage } from '../pages/EvaluationLabPage';
import { WorkflowBuilderPage } from '../pages/WorkflowBuilderPage';
import { PublishedAppPage } from '../pages/PublishedAppPage';
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
        <Route path="/projects/:projectId/evaluations" element={<EvaluationLabPage />} />
        <Route path="/projects/:projectId/evaluations/:agentId" element={<EvaluationLabPage />} />
        <Route path="/projects/:projectId/workflows" element={<WorkflowBuilderPage />} />
        <Route path="/projects/:projectId/workflows/:workflowId" element={<WorkflowBuilderPage />} />
        <Route path="/app/:slug" element={<PublishedAppPage />} />
      </Routes>
    </BrowserRouter>
  );
}
