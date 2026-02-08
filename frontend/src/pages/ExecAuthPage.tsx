import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Shield } from 'lucide-react';
import { AnimatedPage } from '../components/motion/AnimatedPage';
import { PageContainer } from '../components/layout/PageContainer';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { TabsSegmented } from '../components/ui/TabsSegmented';
import { AnimatedTabContent } from '../components/motion/AnimatedTabContent';
import { useAuth } from '../contexts/AuthContext';

const tabs = [
  { key: 'signin', label: 'Sign In' },
  { key: 'signup', label: 'Sign Up' },
];

export function ExecAuthPage() {
  const [mode, setMode] = useState('signin');
  const navigate = useNavigate();
  const auth = useAuth();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const user = await auth.login(loginEmail, loginPassword);
      if (user.roles.includes('CLUB_LEADER') && user.adminClub) {
        navigate(`/exec/club/${user.adminClub}`);
      } else {
        navigate('/exec/onboarding');
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (regPassword !== regConfirm) { setRegError('Passwords do not match'); return; }
    if (regPassword.length < 6) { setRegError('Password must be at least 6 characters'); return; }
    setRegLoading(true);
    try {
      await auth.register(regEmail, regPassword, regName || undefined);
      navigate('/exec/onboarding');
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <AnimatedPage>
      <PageContainer className="flex items-center justify-center min-h-[calc(100dvh-10rem)]">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-calm-400 text-white shadow-md">
                <Shield size={28} />
              </div>
              <h1 className="text-xl font-bold text-warmGray-800">Club Executive Portal</h1>
              <p className="mt-1 text-sm text-warmGray-500">Sign in or create an account to manage your club</p>
            </div>

            <div className="mb-6 flex justify-center">
              <TabsSegmented tabs={tabs} active={mode} onChange={setMode} />
            </div>

            <AnimatedTabContent activeKey={mode}>
              {mode === 'signin' ? (
                <form className="space-y-4" onSubmit={handleLogin}>
                  <Input label="Email" type="email" placeholder="you@mcgill.ca" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  <Input label="Password" type="password" placeholder="Enter your password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                  {loginError && <p className="text-sm text-cozy-500">{loginError}</p>}
                  <Button variant="cozyGradient" className="w-full" icon={<ArrowRight size={16} />} disabled={loginLoading}>
                    {loginLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={handleRegister}>
                  <Input label="Full Name" placeholder="Your full name" value={regName} onChange={(e) => setRegName(e.target.value)} />
                  <Input label="Email" type="email" placeholder="you@mcgill.ca" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                  <Input label="Password" type="password" placeholder="Create a password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />
                  <Input label="Confirm Password" type="password" placeholder="Confirm your password" value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} required />
                  {regError && <p className="text-sm text-cozy-500">{regError}</p>}
                  <Button variant="cozyGradient" className="w-full" icon={<ArrowRight size={16} />} disabled={regLoading}>
                    {regLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              )}
            </AnimatedTabContent>

            <div className="mt-6 text-center">
              <Link to="/auth" className="text-xs text-warmGray-400 hover:text-warmGray-600 transition-colors">
                Looking for student sign up? Go here
              </Link>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    </AnimatedPage>
  );
}
