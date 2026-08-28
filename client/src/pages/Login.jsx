import { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useStore } from '../store';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/authService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { ROUTE } from '../utils/urls';

const REMEMBER_KEY = 'ept_remember_login';

function loadRememberedCredentials() {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return { email: '', password: '', rememberMe: false };
    const data = JSON.parse(raw);
    if (!data?.rememberMe) return { email: '', password: '', rememberMe: false };
    return {
      email: data.email || '',
      password: data.password || '',
      rememberMe: true,
    };
  } catch {
    return { email: '', password: '', rememberMe: false };
  }
}

function saveRememberedCredentials(email, password) {
  localStorage.setItem(
    REMEMBER_KEY,
    JSON.stringify({ email, password, rememberMe: true })
  );
}

function clearRememberedCredentials() {
  localStorage.removeItem(REMEMBER_KEY);
}

const Login = () => {

  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [capsLock,   setCapsLock]   = useState(false);

  const token = useStore((s) => s.token);
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  const login = useStore((s) => s.login);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = loadRememberedCredentials();
    setEmail(saved.email);
    setPassword(saved.password);
    setRememberMe(saved.rememberMe);
  }, []);

  const handleRememberMeChange = (checked) => {
    const isChecked = checked === true;
    setRememberMe(isChecked);
    if (!isChecked) {
      clearRememberedCredentials();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginUser(email, password);
      
      if (rememberMe) {
        saveRememberedCredentials(email, password);
      } else {
        clearRememberedCredentials();
      }
      login(data);
      authLogin(data);
      await useStore.getState().fetchMerchant();
      navigate(ROUTE.dashboard);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/src/services/assets/main-logo.png" alt="Logo" className="h-11 w-auto object-contain" />
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email}
                  autoComplete="off"
                  onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    autoComplete="new-password"
                    className="pr-10"
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                    onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {capsLock && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Caps Lock is on
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={handleRememberMeChange}
                  />

                  <Label
                    htmlFor="rememberMe"
                    className="text-sm font-normal text-slate-600 dark:text-slate-400 cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>

                <Link
                  to={ROUTE.forgotPassword}
                  className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {error && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : 'Sign in'}
              </Button>

              <p className="text-center text-sm text-slate-500">
                Don't have an account?{' '}
                <Link to={ROUTE.signup} className="text-indigo-600 hover:underline">Sign up</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
