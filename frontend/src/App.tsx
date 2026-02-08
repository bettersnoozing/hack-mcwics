import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ApiProvider } from './contexts/ApiContext';
import { DevSessionProvider } from './contexts/DevSessionContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { OutboxProvider } from './contexts/OutboxContext';
import { AppShell } from './components/layout/AppShell';
import { Landing } from './pages/Landing';
import { ClubPage } from './pages/ClubPage';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/student/Dashboard';
import { ApplicationForm } from './pages/student/ApplicationForm';
import { ApplicationView } from './pages/student/ApplicationView';
import { Forum } from './pages/student/Forum';
import { AdminHome } from './pages/admin/AdminHome';
import { Recruitment } from './pages/admin/Recruitment';
import { Applications } from './pages/admin/Applications';
import { ApplicationDetail } from './pages/admin/ApplicationDetail';
import { FormBuilder } from './pages/admin/FormBuilder';
import { ExecAuthPage } from './pages/ExecAuthPage';
import { ExecOnboarding } from './pages/exec/ExecOnboarding';
import { ClubDashboard } from './pages/exec/ClubDashboard';
import { ChatPage } from './pages/ChatPage';


const useRealAuth = import.meta.env.VITE_USE_REAL_AUTH === 'true';

function SessionWrapper({ children }: { children: React.ReactNode }) {
  if (useRealAuth) {
    return <AuthProvider>{children}</AuthProvider>;
  }
  return <DevSessionProvider>{children}</DevSessionProvider>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ApiProvider>
        <SessionWrapper>
          <ToastProvider>
            <OutboxProvider>
            <Routes>
              <Route element={<AppShell />}>
                {/* Public */}
                <Route path="/" element={<Landing />} />
                <Route path="/clubs/:clubId" element={<ClubPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/chat" element={<ChatPage />} />

                {/* Student */}
                <Route path="/app" element={<Dashboard />} />
                <Route path="/app/apply/:clubId/:openRoleId" element={<ApplicationForm />} />
                <Route path="/app/applications/:applicationId" element={<ApplicationView />} />
                <Route path="/app/forum/:applicationGroupId" element={<Forum />} />

                {/* Exec */}
                <Route path="/exec/auth" element={<ExecAuthPage />} />
                <Route path="/exec/onboarding" element={<ExecOnboarding />} />
                <Route path="/exec/club/:clubId" element={<ClubDashboard />} />

                {/* Admin */}
                <Route path="/admin" element={<AdminHome />} />
                <Route path="/admin/recruitment" element={<Recruitment />} />
                <Route path="/admin/recruitment/roles/:openRoleId/form" element={<FormBuilder />} />
                <Route path="/admin/applications" element={<Applications />} />
                <Route path="/admin/applications/:applicationId" element={<ApplicationDetail />} />
              </Route>
            </Routes>
            </OutboxProvider>
          </ToastProvider>
        </SessionWrapper>
      </ApiProvider>
    </BrowserRouter>
  );
}
