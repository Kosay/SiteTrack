
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Query } from 'firebase/firestore';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { ConstructionActivity, ProgressLog, ProgressLogWithActivity, Project, User as SiteUser } from '@/lib/types';
import { format, subDays } from 'date-fns';

/**
 * Custom hook to fetch and process construction data from Firestore.
 */
export function useFirestoreData() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Memoize collection references
  const activitiesCollectionRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, `users/${user.uid}/constructionActivities`);
  }, [user, firestore]);

  // Use the useCollection hook to get real-time updates
  const { data: activities, isLoading: isLoadingActivities } = useCollection<ConstructionActivity>(activitiesCollectionRef);

  const allProgressLogsCollectionRef = useMemoFirebase(() => {
     if (!user || !firestore) return null;
    // This is a collection group query to get all progress logs for a user across all activities
    // You will need to create an index for this query in Firestore
    return query(collection(firestore, `users/${user.uid}/constructionActivities`));
  }, [user, firestore]);

  const { data: rawProgressLogs, isLoading: isLoadingLogs } = useCollection<ProgressLog>(
    useMemoFirebase(() => {
      if (!user || !firestore || !activities) return null;
       const allLogs: ProgressLog[] = [];
       const promises = activities.map(activity => {
           const logsCollection = collection(firestore, `users/${user.uid}/constructionActivities/${activity.id}/progressLogs`);
            return getDocs(logsCollection).then(snapshot => {
                snapshot.forEach(doc => {
                    allLogs.push({ id: doc.id, ...doc.data() } as ProgressLog);
                });
            });
       });
       Promise.all(promises);
       return allLogs.length > 0 ? query(collection(firestore, `users/${user.uid}/constructionActivities/${activities[0].id}/progressLogs`)) : null;

    }, [user, firestore, activities])
  );

  useEffect(() => {
    if (!user || !firestore) return;

    const fetchUserProjects = async () => {
      setIsLoadingProjects(true);
      const projectsRef = collection(firestore, 'projects');
      const projectsQuery = query(projectsRef, where('archived', '!=', true));
      const projectsSnapshot = await getDocs(projectsQuery);
      const allProjects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      
      const memberChecks = allProjects.map(async (project) => {
        const memberRef = doc(firestore, `projects/${project.id}/members/${user.uid}`);
        const memberSnap = await getDoc(memberRef);
        return memberSnap.exists() ? project : null;
      });

      const projectsUserIsMemberOf = (await Promise.all(memberChecks)).filter(p => p !== null) as Project[];
      setUserProjects(projectsUserIsMemberOf);
      setIsLoadingProjects(false);
    };

    fetchUserProjects();
  }, [user, firestore]);

  const progressLogs = useMemo(() => {
    if (!rawProgressLogs || !activities) return [];
    
    const activityMap = new Map(activities.map(a => [a.id, a.name]));

    return rawProgressLogs.map(log => ({
      ...log,
      activityName: activityMap.get(log.activityId) || 'Unknown Activity',
       logDate: log.logDate ? format(new Date(log.logDate.seconds * 1000), 'yyyy-MM-dd') : 'N/A',
       status: ['Not Started', 'In Progress', 'Completed'][Math.floor(Math.random() * 3)],
    })).sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime()) as ProgressLogWithActivity[]
  }, [rawProgressLogs, activities]);


  // Derived state for charts and recent logs
  const { activityProgressData, overallProgressData, recentLogs } = useMemo(() => {
    if (!activities || !progressLogs) {
      return {
        activityProgressData: [],
        overallProgressData: [],
        recentLogs: [],
      };
    }

    // Calculate progress per activity
    const activityProgress = activities.map(activity => {
      const logsForActivity = progressLogs.filter(log => log.activityId === activity.id);
      const latestLog = logsForActivity[0]; // Assumes logs are sorted by date desc
      return {
        name: activity.name,
        progress: latestLog ? latestLog.progressPercentage : 0,
      };
    });

    // Calculate overall progress timeline (e.g., last 30 days)
    const overallProgress: { date: string; progress: number }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      const dateString = format(date, 'MMM d');
      const logsUpToDate = progressLogs.filter(log => new Date(log.logDate) <= date);
      
      let totalPercentage = 0;
      if(logsUpToDate.length > 0) {
          totalPercentage = logsUpToDate.reduce((acc, log) => acc + log.progressPercentage, 0) / logsUpToDate.length;
      }
      
      overallProgress.push({
        date: dateString,
        progress: Math.round(totalPercentage),
      });
    }

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
    isLoading: isUserLoading || isLoadingActivities || isLoadingLogs || isLoadingProjects,
  };
}
