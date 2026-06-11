import { Navigate, Route, Routes } from 'react-router';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ProjectWorkspacePage } from '../pages/ProjectWorkspacePage';
import { AgentStudioPage } from '../pages/AgentStudioPage';
import { EvaluationLabPage } from '../pages/EvaluationLabPage';
import { WorkflowBuilderPage } from '../pages/WorkflowBuilderPage';
import { WorkflowRunPage } from '../pages/WorkflowRunPage';
import { PublishedAppPage } from '../pages/PublishedAppPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { LoginPage } from '../pages/LoginPage';
import { queryClient } from '../lib/query-client';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectWorkspacePage />} />
          <Route path="/projects/:projectId/agents" element={<AgentStudioPage />} />
          <Route path="/projects/:projectId/agents/:agentId" element={<AgentStudioPage />} />
          <Route path="/projects/:projectId/evaluations" element={<EvaluationLabPage />} />
          <Route path="/projects/:projectId/evaluations/:agentId" element={<EvaluationLabPage />} />
          <Route path="/projects/:projectId/workflows" element={<WorkflowBuilderPage />} />
          <Route path="/projects/:projectId/workflows/:workflowId" element={<WorkflowBuilderPage />} />
          <Route path="/projects/:projectId/runs/:runId" element={<WorkflowRunPage />} />
          <Route path="/app/:slug" element={<PublishedAppPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
