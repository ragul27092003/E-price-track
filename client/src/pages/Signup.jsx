import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../hooks/useApi';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Rss, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';

const Field = ({ label, error, success, children }) => (
  <div className="space-y-1">
    <Label>{label}</Label>
    {children}
    {error   && <p className="text-xs text-red-500 flex items-center gap-1 mt-1"><XCircle className="w-3 h-3 shrink-0" />{error}</p>}
    {success && !error && <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><CheckCircle2 className="w-3 h-3 shrink-0" />{success}</p>}
  </div>
);

const Signup = () => {
  const [form, setForm] = useState({
    companyName: '',
    companyUrl:  '',
    phone:       '',
    email:       '',
    password:    '',
    confirmPassword: '',
  });
  const [errors,      setErrors]      = useState({});
  const [touched,     setTouched]     = useState({});
  const [emailStatus, setEmailStatus] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [serverError,  setServerError]  = useState('');
  const navigate = useNavigate();

  const validate = (field, value, currentForm = form) => {
    switch (field) {
      case 'companyName':
        if (!value.trim()) return 'Company name is required';
        if (value.trim().length < 2) return 'Minimum 2 characters';
        return '';
      case 'companyUrl':
        if (!value.trim()) return 'Company URL is required';
        if (!/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(value))
          return 'Enter a valid company URL';
        return '';
      case 'phone':
        if (!value.trim()) return 'Phone number is required';
        if (!/^\+?[\d\s\-()]{7,15}$/.test(value)) return 'Enter a valid phone number';
        return '';
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Minimum 8 characters';
        if (!/[A-Z]/.test(value)) return 'Must contain at least one uppercase letter';
        if (!/[0-9]/.test(value)) return 'Must contain at least one number';
        return '';
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== currentForm.password) return 'Passwords do not match';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    if (id === 'phone' && value && !/^[\d\s\-()+]*$/.test(value)) return;
    const updated = { ...form, [id]: value };
    setForm(updated);
    if (touched[id]) setErrors(prev => ({ ...prev, [id]: validate(id, value, updated) }));
    if (id === 'password' && touched.confirmPassword)
      setErrors(prev => ({
        ...prev,
        confirmPassword: validate('confirmPassword', updated.confirmPassword, updated),
      }));
  };

  const handleBlur = useCallback(async (e) => {
    const { id, value } = e.target;
    setTouched(prev => ({ ...prev, [id]: true }));
    const error = validate(id, value);
    setErrors(prev => ({ ...prev, [id]: error }));

    // Check email availability
    if (id === 'email' && !error && value) {
      setEmailStatus('checking');
      try {
        const { data } = await API.get(`/auth/check-email?email=${encodeURIComponent(value)}`);
        setEmailStatus(data.exists ? 'taken' : 'available');
        if (data.exists) setErrors(prev => ({ ...prev, email: 'This email is already registered' }));
      } catch {
        setEmailStatus(null);
      }
    }

    // Check company name availability
    if (id === 'companyName' && !error && value.trim().length >= 2) {
      try {
        const { data } = await API.get(
          `/auth/check-companyname?companyName=${encodeURIComponent(value.trim())}`
        );
        if (data.exists) {
          setErrors(prev => ({ ...prev, companyName: 'This company name is already taken' }));
        }
      } catch {
        // silently ignore
      }
    }
  }, [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fields = ['companyName', 'companyUrl', 'phone', 'email', 'password', 'confirmPassword'];
    const newErrors = {};
    fields.forEach(f => { newErrors[f] = validate(f, form[f]); });
    setErrors(newErrors);
    setTouched(Object.fromEntries(fields.map(f => [f, true])));
    if (Object.values(newErrors).some(Boolean) || emailStatus === 'taken') return;

    setServerError('');
    setLoading(true);
    try {
      // Send companyName + companyUrl to backend
      await API.post('/auth/signup', {
        companyName: form.companyName,
        companyUrl:  form.companyUrl,
        phone:       form.phone,
        email:       form.email,
        password:    form.password,
      });
      navigate('/login?registered=1');
    } catch (err) {
      const message = err.response?.data?.message || 'Signup failed. Please try again.';
      const field   = err.response?.data?.field;
      if (field === 'companyName') {
        setErrors(prev => ({ ...prev, companyName: message }));
        setTouched(prev => ({ ...prev, companyName: true }));
      } else {
        setServerError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) =>
    touched[field] && errors[field]  ? 'border-red-400 focus-visible:ring-red-300'
    : touched[field] && !errors[field] ? 'border-green-400 focus-visible:ring-green-300'
    : '';

  const strength = (() => {
    let s = 0;
    if (form.password.length >= 8)       s++;
    if (/[A-Z]/.test(form.password))     s++;
    if (/[0-9]/.test(form.password))     s++;
    if (/[^A-Za-z0-9]/.test(form.password)) s++;
    return s;
  })();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Rss className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">DigitalDataFeed</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Create your store</CardTitle>
            <CardDescription>Sign up to start managing your product feed</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
                <Field
                  label="Company Name *"
                  error={touched.companyName && errors.companyName}
                >
                  <Input
                    id="companyName"
                    placeholder="e.g. Hari Electronics"
                    value={form.companyName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={inputClass('companyName')}
                  />
                </Field>

                {/* Company URL */}
                <Field
                  label="Company URL *"
                  error={touched.companyUrl && errors.companyUrl}
                >
                  <Input
                    id="companyUrl"
                    placeholder="e.g. harielectronics.com"
                    value={form.companyUrl}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={inputClass('companyUrl')}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <Field
                  label="Email *"
                  error={touched.email && errors.email}
                  success={emailStatus === 'available' ? 'Email is available' : ''}
                >
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`pr-8 ${inputClass('email')}`}
                    />
                    {emailStatus === 'checking' && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </Field>

                {/* Phone */}
                <Field label="Phone Number *" error={touched.phone && errors.phone}>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    inputMode="numeric"
                    maxLength={15}
                    className={inputClass('phone')}
                  />
                </Field>
              </div>

              {/* Password */}
              <Field label="Password *" error={touched.password && errors.password}>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 chars, 1 uppercase, 1 number"
                    value={form.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`pr-10 ${inputClass('password')}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          i <= strength
                            ? ['','bg-red-400','bg-yellow-400','bg-blue-400','bg-green-500'][strength]
                            : 'bg-slate-200 dark:bg-slate-700'
                        }`} />
                      ))}
                    </div>
                    <p className={`text-xs ${['','text-red-500','text-yellow-600','text-blue-600','text-green-600'][strength]}`}>
                      Password strength: {['','Weak','Fair','Good','Strong'][strength]}
                    </p>
                  </div>
                )}
              </Field>

              {/* Confirm Password */}
              <Field
                label="Confirm Password *"
                error={touched.confirmPassword && errors.confirmPassword}
                success={touched.confirmPassword && !errors.confirmPassword && form.confirmPassword ? 'Passwords match' : ''}
              >
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`pr-10 ${inputClass('confirmPassword')}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>

              {serverError && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-3 py-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />{serverError}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</>
                  : 'Create Account'
                }
              </Button>

              <p className="text-center text-sm text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="text-indigo-600 hover:underline font-medium">Sign in</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
