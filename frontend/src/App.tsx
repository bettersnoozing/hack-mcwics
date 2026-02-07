import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ApiProvider } from './contexts/ApiContext';
import { DevSessionProvider } from './contexts/DevSessionContext';
import { ToastProvider } from './contexts/ToastContext';
import { OutboxProvider } from './contexts/OutboxContext';
import { AppShell } from './components/layout/AppShell';
import { Landing } from './pages/Landing';
import { ClubPage } from './pages/ClubPage';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/student/Dashboard';
import { ApplicationForm } from './pages/student/ApplicationForm';
import { Forum } from './pages/student/Forum';
import { AdminHome } from './pages/admin/AdminHome';
import { Recruitment } from './pages/admin/Recruitment';
import { Applications } from './pages/admin/Applications';
import { ApplicationDetail } from './pages/admin/ApplicationDetail';
import { FormBuilder } from './pages/admin/FormBuilder';

export default function App() {
  return (
    <BrowserRouter>
      <ApiProvider>
        <DevSessionProvider>
          <ToastProvider>
            <OutboxProvider>
            <Routes>
              <Route element={<AppShell />}>
                {/* Public */}
                <Route path="/" element={<Landing />} />
                <Route path="/clubs/:slug" element={<ClubPage />} />
                <Route path="/auth" element={<AuthPage />} />

                {/* Student */}
                <Route path="/app" element={<Dashboard />} />
                <Route path="/app/apply/:clubSlug/:positionId" element={<ApplicationForm />} />
                <Route path="/app/forum/:applicationGroupId" element={<Forum />} />

                {/* Admin */}
                <Route path="/admin" element={<AdminHome />} />
                <Route path="/admin/recruitment" element={<Recruitment />} />
                <Route path="/admin/recruitment/positions/:positionId/form" element={<FormBuilder />} />
                <Route path="/admin/applications" element={<Applications />} />
                <Route path="/admin/applications/:applicationId" element={<ApplicationDetail />} />
              </Route>
            </Routes>
            </OutboxProvider>
          </ToastProvider>
        </DevSessionProvider>
      </ApiProvider>
    </BrowserRouter>
  );
}
