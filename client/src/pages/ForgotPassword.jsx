import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  requestPasswordOtp,
  verifyPasswordOtp,
  resetPasswordWithToken,
} from '../services/authService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '../components/ui/input-otp';
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const STEPS = ['email', 'otp', 'password'];

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validatePassword(password) {
  if (!password) return 'New password is required';
  if (password.length < 8) return 'Minimum 8 characters required';
  if (!/[A-Z]/.test(password)) return 'Must contain at least one uppercase letter';
  if (!/[0-9]/.test(password)) return 'Must contain at least one number';
  return null;
}

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  const stepIndex = STEPS.indexOf(step);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const data = await requestPasswordOtp(email.trim());
      setSuccess(data.message || 'OTP sent to your email');
      if (data.devOtp) setDevOtp(data.devOtp);
      setOtp('');
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const data = await verifyPasswordOtp(email.trim(), otp);
      setResetToken(data.resetToken);
      setSuccess(data.message || 'OTP verified');
      setStep('password');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const data = await resetPasswordWithToken(resetToken, newPassword);
      setSuccess(data.message || 'Password reset successfully');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data = await requestPasswordOtp(email.trim());
      setSuccess(data.message || 'New OTP sent');
      if (data.devOtp) setDevOtp(data.devOtp);
      setOtp('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="./src/services/assets/main-logo.png" alt="Logo" className="h-11 w-auto object-contain" />
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Forgot Password</CardTitle>
            <CardDescription>
              {step === 'email' && 'Enter your email to receive a reset OTP'}
              {step === 'otp' && 'Enter the 6-digit OTP sent to your email'}
              {step === 'password' && 'Create your new password'}
            </CardDescription>
            <div className="flex items-center justify-center gap-2 pt-2">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    i <= stepIndex ? 'bg-[#2B86C5]' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {step === 'email' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {error && <ErrorBox message={error} />}
                {success && <SuccessBox message={success} />}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending OTP...</> : 'Send OTP'}
                </Button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <p className="text-sm text-slate-500 text-center">
                  OTP sent to <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span>
                  <br />
                  <span className="text-xs">Valid for 5 minutes</span>
                </p>
                {devOtp && (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-center">
                    Dev mode OTP: <strong>{devOtp}</strong>
                  </div>
                )}
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && <ErrorBox message={error} />}
                {success && <SuccessBox message={success} />}
                <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : 'Verify OTP'}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={handleResendOtp} disabled={loading}>
                  Resend OTP
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(''); setSuccess(''); }}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Change email
                </button>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPassword}
                      className="pr-10"
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">Min 8 chars, 1 uppercase, 1 number</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      className="pr-10"
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {error && <ErrorBox message={error} />}
                {success && <SuccessBox message={success} />}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting...</> : 'Reset Password'}
                </Button>
              </form>
            )}

            <p className="text-center text-sm text-slate-500 mt-4">
              <Link to="/eprice/admin/login" className="text-indigo-600 hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function ErrorBox({ message }) {
  return (
    <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
      {message}
    </div>
  );
}

function SuccessBox({ message }) {
  return (
    <div className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-md px-3 py-2">
      {message}
    </div>
  );
}

export default ForgotPassword;
