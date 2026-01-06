'use client';

import { useUser } from '@/firebase';
import { redirect } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { FirebaseClientProvider } from '@/firebase/client-provider';

function RootPageContent() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }

  return null;
}

export default function RootPage() {
  return (
    <FirebaseClientProvider>
      <RootPageContent />
    </FirebaseClientProvider>
  );
}
