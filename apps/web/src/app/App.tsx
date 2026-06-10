import { Navigate, Route, Routes } from 'react-router';
import { BrowserRouter } from 'react-router-dom';
import { ProjectWorkspacePage } from '../pages/ProjectWorkspacePage';
import { ProjectsPage } from '../pages/ProjectsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectWorkspacePage />} />
      </Routes>
    </BrowserRouter>
  );
}
