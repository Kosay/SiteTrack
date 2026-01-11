
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { ConstructionActivity, ProgressLog, ProgressLogWithActivity, Project } from '@/lib/types';
import { format, subDays } from 'date-fns';

/**
 * Custom hook to fetch and process construction data from Firestore.
 */
export function useFirestoreData() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Memoize collection references - This is now legacy and will be removed/refactored
  const activitiesCollectionRef = useMemoFirebase(() => {
    // This collection path is deprecated. We will fetch activities from projects instead.
    return null;
  }, []);

  // This useCollection is based on the legacy path and is causing the error.
  // We will remove it and fetch activities directly from the projects the user is a member of.
  const { data: activities, isLoading: isLoadingActivities } = useCollection<ConstructionActivity>(activitiesCollectionRef);

  const allProgressLogsCollectionRef = useMemoFirebase(() => {
    // This logic is also based on the legacy structure and needs to be updated.
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/constructionActivities`));
  }, [user, firestore]);

  const { data: rawProgressLogs, isLoading: isLoadingLogs } = useCollection<ProgressLog>(
    useMemoFirebase(() => {
        // This complex logic is part of the legacy structure.
        // It will be replaced by querying reports directly from the projects.
        // For now, we return null to stop the failing query.
        return null;
    }, [])
  );

  useEffect(() => {
    if (!user || !firestore) return;

    const fetchUserProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const projectsRef = collection(firestore, 'projects');
        const projectsQuery = query(projectsRef, where('archived', '!=', true));
        const projectsSnapshot = await getDocs(projectsQuery);
        const allProjects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
        
        const memberChecks = allProjects.map(async (project) => {
          const memberDocRef = doc(firestore, `projects/${project.id}/members/${user.uid}`);
          const memberSnap = await getDoc(memberDocRef);
          return memberSnap.exists() ? project : null;
        });

        const projectsUserIsMemberOf = (await Promise.all(memberChecks)).filter(p => p !== null) as Project[];
        setUserProjects(projectsUserIsMemberOf);
      } catch (error) {
        console.error("Failed to fetch user projects:", error);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchUserProjects();
  }, [user, firestore]);

  // This progressLogs logic is based on mock data and needs to be updated to use real Firestore data.
  // For now, we will return an empty array to prevent errors on the Reports page.
  const progressLogs = useMemo(() => {
    // Returning an empty array as the underlying data source is incorrect and being removed.
    return [] as ProgressLogWithActivity[];
  }, []);


  // This derived state will now compute based on the empty progressLogs array, preventing errors.
  const { activityProgressData, overallProgressData, recentLogs } = useMemo(() => {
    if (!activities || !progressLogs) {
      return {
        activityProgressData: [],
        overallProgressData: [],
        recentLogs: [],
      };
    }

    const activityProgress = activities.map(activity => ({
        name: activity.name,
        progress: 0, // Defaulting to 0 as we don't have real progress data here yet
    }));

    // Placeholder for overall progress
    const overallProgress: { date: string; progress: number }[] = [];
    
    return {
      activityProgressData: activityProgress,
      overallProgressData: overallProgress,
      recentLogs: progressLogs.slice(0, 3),
    };
  }, [activities, progressLogs]);

  return {
    activities: activities || [],
    progressLogs,
    activityProgressData,
    overallProgressData,
    recentLogs,
    userProjects,
    // The loading state now correctly reflects fetching projects, not legacy data.
    isLoading: isUserLoading || isLoadingProjects,
  };
}
