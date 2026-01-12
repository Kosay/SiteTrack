
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import type { ProgressLogWithActivity, Project } from '@/lib/types';

/**
 * Custom hook to fetch project and user-related data from Firestore.
 */
export function useFirestoreData() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  useEffect(() => {
    // If the user is still loading or not logged in, we can't fetch their projects.
    if (isUserLoading || !user) {
      // Ensure loading is false if we know there's no user.
      if (!isUserLoading) {
        setIsLoadingProjects(false);
        setUserProjects([]); // Clear any stale data
      }
      return;
    }

    let isMounted = true; // Flag to prevent state updates on unmounted component

    const fetchUserProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const projectsRef = collection(firestore, 'projects');
        const projectsQuery = query(projectsRef, where('archived', '!=', true));
        const projectsSnapshot = await getDocs(projectsQuery);
        const allProjects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
        
        // For each project, check if the current user is a member.
        const memberChecks = allProjects.map(async (project) => {
          const memberDocRef = doc(firestore, `projects/${project.id}/members/${user.uid}`);
          const memberSnap = await getDoc(memberDocRef);
          return memberSnap.exists() ? project : null;
        });

        // Wait for all membership checks to complete.
        const projectsUserIsMemberOf = (await Promise.all(memberChecks)).filter(p => p !== null) as Project[];
        
        if (isMounted) {
          setUserProjects(projectsUserIsMemberOf);
        }
      } catch (error) {
        console.error("Failed to fetch user projects:", error);
         if (isMounted) {
          setUserProjects([]);
        }
      } finally {
         if (isMounted) {
          setIsLoadingProjects(false);
        }
      }
    };

    fetchUserProjects();
    
    return () => {
      isMounted = false; // Cleanup on unmount
    };
  }, [user, firestore, isUserLoading]);


  // The reports page and other components relying on this data have been updated or
  // are being refactored. Returning empty arrays ensures no downstream errors.
  const progressLogs: ProgressLogWithActivity[] = [];
  const activityProgressData: {name: string, progress: number}[] = [];
  const overallProgressData: {date: string, progress: number}[] = [];
  const recentLogs: ProgressLogWithActivity[] = [];


  return {
    // The `activities` collection is no longer needed here as it's fetched directly in the components that use it.
    activities: [], 
    progressLogs,
    activityProgressData,
    overallProgressData,
    recentLogs,
    userProjects,
    // The main loading state now correctly reflects the fetching of user-specific projects.
    isLoading: isUserLoading || isLoadingProjects,
  };
}
