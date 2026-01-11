'use client';

import { useUser, useFirestore } from '@/firebase';
import { useDoc, useMemoFirebase } from '@/firebase';
import type { User } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { LoaderCircle } from 'lucide-react';

// Import the specialized dashboard components
import { EngineerDashboard } from '@/components/dashboards/engineer-dashboard';
import { DefaultDashboard } from '@/components/dashboards/default-dashboard';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Fetch the user's full profile to get their position
  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<User>(userProfileRef);

  if (isUserLoading || isLoadingProfile) {
    return (
        <div className="flex h-full min-h-64 w-full items-center justify-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading Dashboard...</span>
        </div>
    );
  }

  // Use a switch statement to render the correct dashboard based on the user's position
  switch (userProfile?.position) {
    case 'Engineer':
      return <EngineerDashboard userProfile={userProfile} />;
    
    // Add cases for PM, Director, etc. here in the future
    // case 'PM':
    //   return <PmDashboard userProfile={userProfile} />;
    // case 'Director':
    //   return <DirectorDashboard userProfile={userProfile} />;

    default:
      // Render a default dashboard for everyone else (CM, Admin, etc.)
      return <DefaultDashboard userProfile={userProfile} />;
  }
}
