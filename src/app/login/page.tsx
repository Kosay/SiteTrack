'use client';

import { LoginForm } from '@/components/login-form';
import { useUser } from '@/firebase';
import { LoaderCircle } from 'lucide-react';
import { redirect } from 'next/navigation';

export default function LoginPage() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <LoginForm />
    </div>
  );
}
