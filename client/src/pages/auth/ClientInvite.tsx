import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Shield, Lock, User, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { authService } from '../../services/api';
import { cn } from '../../utils/helpers';

interface InviteForm {
  name: string;
  password: string;
  confirmPassword: string;
}

export default function ClientInvitePage() {
  const { tenantId, token } = useParams<{ tenantId: string; token: string }>();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<'verifying' | 'form' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [clientInfo, setClientInfo] = useState<{ companyName: string; email: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<InviteForm>();
  const password = watch('password');

  useEffect(() => {
    if (tenantId && token) {
      verifyToken();
    }
  }, [tenantId, token]);

  const verifyToken = async () => {
    try {
      const res = await authService.verifyClientInvite(tenantId!, token!);
      setClientInfo({
        companyName: res.data.data.client.companyName,
        email: res.data.data.invitation.email
      });
      setStep('form');
    } catch (err: any) {
      setStep('error');
      setErrorMessage(err.response?.data?.message || 'Invalid or expired invitation link.');
    }
  };

  const onSubmit = async (data: InviteForm) => {
    setIsSubmitting(true);
    try {
      await authService.acceptClientInvite(tenantId!, token!, {
        name: data.name,
        password: data.password
      });
      setStep('success');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to complete registration.');
      setStep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'verifying') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        <h2 className="text-xl font-bold text-gray-900">Verifying Invitation...</h2>
        <p className="text-gray-500">Please wait while we validate your secure link.</p>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-rose-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Invitation Error</h2>
        <p className="text-gray-500">{errorMessage}</p>
        <button
          onClick={() => navigate('/login')}
          className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold shadow-md"
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Account Activated!</h2>
        <p className="text-gray-500">Your portal account has been created successfully. Redirecting you to login...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 rounded-2xl mb-4">
          <Shield className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Join {clientInfo?.companyName}</h1>
        <p className="text-gray-500 mt-2">Complete your profile to access the Client Portal.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 mb-2">
          <p className="text-xs text-indigo-700 font-medium text-center">
            Invited as: <span className="font-bold underline">{clientInfo?.email}</span>
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              {...register('name', { required: 'Name is required' })}
              type="text"
              placeholder="Enter your full name"
              className={cn("w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all", errors.name && "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20")}
            />
          </div>
          {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">Create Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              {...register('password', { 
                required: 'Password is required',
                minLength: { value: 8, message: 'Minimum 8 characters' }
              })}
              type="password"
              placeholder="••••••••"
              className={cn("w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all", errors.password && "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20")}
            />
          </div>
          {errors.password && <p className="text-xs text-rose-500 mt-1">{errors.password.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              {...register('confirmPassword', { 
                required: 'Please confirm password',
                validate: value => value === password || 'Passwords do not match'
              })}
              type="password"
              placeholder="••••••••"
              className={cn("w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all", errors.confirmPassword && "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20")}
            />
          </div>
          {errors.confirmPassword && <p className="text-xs text-rose-500 mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Activate My Account'
          )}
        </button>
      </form>
    </div>
  );
}
