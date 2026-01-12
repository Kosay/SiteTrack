'use client';

import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { LoaderCircle } from 'lucide-react';
import { DefaultDashboard } from '@/components/dashboards/default-dashboard';
import { EngineerDashboard } from '@/components/dashboards/engineer-dashboard';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<User>(userProfileRef);

  const isLoading = isUserLoading || isLoadingProfile;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading Dashboard...</p>
      </div>
    );
  }

  // Conditionally render dashboard based on user role
  if (userProfile?.position === 'Engineer') {
    return <EngineerDashboard userProfile={userProfile} />;
  }

  // Fallback to a default dashboard for other roles
  return <DefaultDashboard userProfile={userProfile} />;
}
