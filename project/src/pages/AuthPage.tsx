import React, { useState } from 'react';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4">
      {mode === 'login' ? (
        <LoginForm onSwitchToSignup={() => setMode('signup')} />
      ) : (
        <SignupForm onSwitchToLogin={() => setMode('login')} />
      )}
    </div>
  );
};
