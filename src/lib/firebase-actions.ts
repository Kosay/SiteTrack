
'use client';

import {
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  type Auth,
  type Firestore,
  setDoc,
  deleteDoc,
  writeBatch,
  runTransaction,
  increment,
  type DocumentReference,
  getDocs,
  collectionGroup,
  getFirestore,
  addDoc,
  getDoc,
  type DocumentSnapshot,
  query,
  where
} from 'firebase/firestore';
import { format } from 'date-fns';
import type { 
  Company, UserProfile, EquipmentType, Equipment, 
  Project, User, Invitation, Unit, Activity, 
  SubActivity, DailyReport, ReportItem, 
  ProjectDashboardSummary, SubActivitySummary,
  ProjectMember 
} from './types';

// Helper to get Firestore instance
function getDb(): Firestore {
  return getFirestore();
}

/**
 * CLONE PROJECT: Copies structure and re-establishes membership.
 */
export async function cloneProject(
  sourceProjectId: string, 
  newName: string,
  currentUserId: string // Ensure the creator is added as a member immediately
): Promise<string> {
  const db = getDb();
  
  // 1. Fetch Source Data
  const sourceProjectSnap = await getDoc(doc(db, 'projects', sourceProjectId));
  if (!sourceProjectSnap.exists()) throw new Error("Source project not found");
  
  const sourceData = sourceProjectSnap.data();
  
  // 2. Prepare New Project Data
  const newProjectRef = doc(collection(db, 'projects'));
  const batch = writeBatch(db);

  batch.set(newProjectRef, {
    ...sourceData,
    name: newName,
    doneWork: 0,
    approvedWork: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 3. IMMEDIATELY add the current user as a Member (Fixes Permission Errors)
  // This ensures that as soon as the dashboard tries to load, 'exists()' returns true.
  const memberRef = doc(db, `projects/${newProjectRef.id}/members/${currentUserId}`);
  batch.set(memberRef, {
    role: 'director', // or the user's actual role
    createdAt: serverTimestamp(),
  });

  // 4. Initialize Dashboard Summary
  const summaryRef = doc(db, `projects/${newProjectRef.id}/dashboards/summary`);
  batch.set(summaryRef, {
    subActivityCount: 0, // Will update as we add sub-activities
    overallProgress: 0,
    lastReportAt: null,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return newProjectRef.id;
}


/**
 * PROJECT WIZARD: ATOMIC TRANSACTION
 * This ensures the Project, Members, Zones, and BoQ are created as one single unit.
 */
export async function createProjectFromWizard(
  formData: any, 
  collections: { userMap: Map<string, User> }
): Promise<string> {
  const db = getDb();
  const batch = writeBatch(db);
  const { userMap } = collections;

  // 1. Generate Project Reference
  const projectRef = doc(collection(db, 'projects'));
  const totalWork = (formData.subActivities || []).reduce((acc: number, sa: any) => acc + (Number(sa.totalWork) || 0), 0);

  const projectData = {
    name: formData.name,
    companyId: formData.companyId,
    directorId: formData.directorId,
    pmId: formData.pmId,
    pmName: userMap.get(formData.pmId)?.name || 'Unknown',
    status: formData.status || 'active',
    address: formData.address,
    googleMapsUrl: formData.googleMapsUrl,
    kmlUrl: formData.kmlUrl,
    archived: false,
    totalWork: totalWork,
    doneWork: 0,
    approvedWork: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  batch.set(projectRef, projectData);

  // 2. Initialize Dashboard Summary
  const summaryRef = doc(db, `projects/${projectRef.id}/dashboards/summary`);
  batch.set(summaryRef, {
    subActivityCount: formData.subActivities?.length || 0,
    totalProgressSum: 0,
    overallProgress: 0,
    lastReportAt: null,
    updatedAt: serverTimestamp(),
  });

  // 3. Add Members
  const team = [
    { id: formData.directorId, role: 'director' },
    { id: formData.pmId, role: 'pm' },
    ...(formData.cmIds || []).map((id: string) => ({ id, role: 'cm' })),
    ...(formData.engineerIds || []).map((id: string) => ({ id, role: 'engineer' })),
  ];

  team.forEach(member => {
    if (member.id) {
      const user = userMap.get(member.id);
      if (user) {
        const memberRef = doc(db, `projects/${projectRef.id}/members/${member.id}`);
        batch.set(memberRef, {
          role: member.role,
          userName: user.name,
          position: user.position,
          createdAt: serverTimestamp(),
        });
      }
    }
  });

  // 4. Add Activities and Sub-activities
  const activityMap = new Map<string, DocumentReference>();
  const activityCodeToNameMap = new Map<string, string>();


  for (const act of formData.activities) {
    const actRef = doc(collection(db, `projects/${projectRef.id}/activities`));
    activityMap.set(act.code, actRef);
    activityCodeToNameMap.set(act.code, act.name); // Store name along with ref
    batch.set(actRef, {
      name: act.name,
      code: act.code,
      description: act.description,
      totalWork: 0,
      createdAt: serverTimestamp(),
    });
  }
  
  const allZones = formData.zones || [];

  for (const sa of formData.subActivities) {
    const actRef = activityMap.get(sa.activityCode);
    if (!actRef) {
        console.warn(`Skipping sub-activity "${sa.name}" because its parent activity code "${sa.activityCode}" was not found.`);
        continue;
    }


    const saRef = doc(collection(db, actRef.path, 'subactivities'));
    batch.set(saRef, {
      name: sa.name,
      BoQ: sa.BoQ,
      description: sa.description,
      unit: sa.unit,
      totalWork: sa.totalWork,
      zoneQuantities: sa.zoneQuantities,
      createdAt: serverTimestamp(),
    });

    // Initialize progressByZone map for the summary
    const progressByZone = allZones.reduce((acc: any, zone: any) => {
        acc[zone.name] = { doneWork: 0, pendingWork: 0 };
        return acc;
    }, {});


    // Sub-activity specific dashboard entry
    const saSummaryRef = doc(db, `projects/${projectRef.id}/dashboards/${saRef.id}`);
    const activityName = activityCodeToNameMap.get(sa.activityCode) || 'Unknown Activity';

    batch.set(saSummaryRef, {
      totalWork: sa.totalWork,
      doneWork: 0,
      pendingWork: 0,
      workGradeA: 0,
      workGradeB: 0,
      workGradeC: 0,
      unit: sa.unit,
      activityName: activityName,
      subActivityName: sa.name,
      BoQ: sa.BoQ,
      progressByZone: progressByZone,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
  return projectRef.id;
}

/**
 * DAILY REPORTING: ENSURES PROGRESS UPDATES ARE ATOMIC
 * Fixed to be resilient against missing SubActivitySummary documents.
 */
export async function createDailyReport(data: any): Promise<void> {
    const db = getDb();
    const { projectId, items, reportDate, ...header } = data;

    // Safety check for Date object
    const dateObj = reportDate instanceof Date ? reportDate : new Date(reportDate);

    await runTransaction(db, async (transaction) => {
        // --- 1. PREPARE REFERENCES ---
        // Prepare the overall project summary reference
        const projectSummaryRef = doc(db, `projects/${projectId}/dashboards/summary`);
        
        // Prepare all sub-activity summary references based on report items
        const summaryRefs = items.map((item: ReportItem) => 
            doc(db, `projects/${projectId}/dashboards/${item.subActivityId}`)
        );

        // --- 2. READ PHASE (All reads must happen before any writes) ---
        // We fetch the overall summary and all item-specific summaries in parallel
        const projectSummarySnap = await transaction.get(projectSummaryRef);
        const summarySnaps = await Promise.all(summaryRefs.map(ref => transaction.get(ref)));

        // --- 3. WRITE PHASE ---
        const reportRef = doc(collection(db, `projects/${projectId}/daily_reports`));
        const diaryDate = format(dateObj, 'yyyyMMdd');

        // WRITE 1: Create the main Daily Report document
        transaction.set(reportRef, {
            ...header,
            reportDate: dateObj,
            diaryDate: diaryDate,
            status: 'Pending',
            createdAt: serverTimestamp(),
        });

        // WRITE 2: Update the Project Dashboard Summary (if it exists)
        if (projectSummarySnap.exists()) {
            transaction.update(projectSummaryRef, {
                lastReportAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }

        // WRITE 3: Process individual Report Items
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const summarySnap = summarySnaps[i];

            // Create the individual report item in the sub-collection
            const itemRef = doc(collection(db, reportRef.path, 'items'));
            transaction.set(itemRef, item);
            
            // Atomically update the summary ONLY if the document was found in the read phase
            if (summarySnap.exists()) {
                const zoneName = item.zoneName;
                const updateData: { [key: string]: any } = {
                    pendingWork: increment(item.quantity),
                    updatedAt: serverTimestamp()
                };

                // If zoneName is present, update the nested map
                if (zoneName) {
                    updateData[`progressByZone.${zoneName}.pendingWork`] = increment(item.quantity);
                }
                
                transaction.update(summarySnap.ref, updateData);
            } else {
                // LOG THE ERROR but do NOT throw/abort. This allows the rest of the report to save.
                console.error(`SubActivitySummary for ID ${item.subActivityId} not found. Skipping pendingWork update for this item.`);
            }
        }
    });
}

/**
 * GLOBAL DATA HELPERS (Companies, Units, Equipment)
 */
export async function addCompany(auth: Auth, data: Partial<Company>): Promise<void> {
  if (!auth.currentUser) throw new Error("Authentication required.");
  const ref = doc(collection(getDb(), 'companies'));
  await setDoc(ref, { ...data, archived: false, createdAt: serverTimestamp() });
}

export async function addUnit(data: Partial<Unit>): Promise<void> {
  await addDoc(collection(getDb(), 'units'), { ...data, createdAt: serverTimestamp() });
}

export async function deleteUnit(unitId: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'units', unitId));
}

export async function createUserProfile(
  auth: Auth,
  uid: string,
  data: Omit<UserProfile, 'project'> & { project: null }
): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('User must be authenticated to create a user profile.');
  }
  if (!uid) {
    throw new Error('A valid User ID (UID) must be provided.');
  }
  const userProfileRef = doc(getDb(), `users/${uid}`);
  await setDoc(userProfileRef, { ...data, createdAt: serverTimestamp() }, {});
}

export async function updateCompany(
  auth: Auth,
  companyId: string,
  data: Partial<Company>
): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('User must be authenticated to update a company.');
  }
  const companyDocRef = doc(getDb(), 'companies', companyId);
  await updateDoc(companyDocRef, { ...data, updatedAt: serverTimestamp() });
}

export async function addEquipmentType(data: Omit<EquipmentType, 'id'>): Promise<void> {
  await addDoc(collection(getDb(), 'equipment_names'), { ...data, createdAt: serverTimestamp() });
}

export async function deleteEquipmentType(equipmentTypeId: string): Promise<void> {
  if (!equipmentTypeId) throw new Error('A valid Equipment Type ID must be provided.');
  await deleteDoc(doc(getDb(), 'equipment_names', equipmentTypeId));
}

export async function addEquipment(data: Omit<Equipment, 'id'>): Promise<void> {
  await addDoc(collection(getDb(), 'equipment'), { ...data, createdAt: serverTimestamp() });
}

export async function batchAddEquipment(equipmentList: Omit<Equipment, 'id'>[]): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  const equipmentCollectionRef = collection(db, 'equipment');
  equipmentList.forEach(equipmentData => {
    const docRef = doc(equipmentCollectionRef);
    batch.set(docRef, { ...equipmentData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
  await batch.commit();
}

export async function addProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'totalWork' | 'doneWork' | 'approvedWork'>): Promise<void> {
  const projectsCollectionRef = collection(getDb(), 'projects');
  const newProject = {
    ...data,
    totalWork: 0,
    doneWork: 0,
    approvedWork: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await addDoc(projectsCollectionRef, newProject);
}

export async function updateProject(
  projectId: string,
  data: Partial<Project>
): Promise<void> {
  const projectDocRef = doc(getDb(), 'projects', projectId);
  await updateDoc(projectDocRef, { ...data, updatedAt: serverTimestamp() });
}

export async function createInvitation(data: Omit<Invitation, 'id' | 'code' | 'status' | 'createdAt'>): Promise<void> {
  const invitationsCollectionRef = collection(getDb(), 'invitations');
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  const newInvitation: Omit<Invitation, 'id'> = {
    ...data,
    code,
    status: 'pending',
    createdAt: serverTimestamp(),
  };
  await addDoc(invitationsCollectionRef, newInvitation);
}

export async function updateUser(
  userId: string,
  data: Partial<Omit<User, 'id' | 'email'>>
): Promise<void> {
  const userDocRef = doc(getDb(), 'users', userId);
  await updateDoc(userDocRef, { ...data, updatedAt: serverTimestamp() });
}

export async function addActivity(projectId: string, data: Omit<Activity, 'id' | 'totalWork' | 'doneWork' | 'approvedWork' | 'pendingWork' | 'workGradeA' | 'workGradeB' | 'workGradeC' | 'plannedQuantity' | 'plannedStartDate' | 'plannedEndDate' >): Promise<void> {
    if (!projectId) throw new Error("A valid Project ID must be provided.");
    const activitiesCollectionRef = collection(getDb(), `projects/${projectId}/activities`);
    const newActivity = {
        ...data,
        totalWork: 0,
        doneWork: 0,
        approvedWork: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    await addDoc(activitiesCollectionRef, newActivity);
}

export async function updateActivity(projectId: string, activityId: string, data: Partial<Activity>): Promise<void> {
    if (!projectId || !activityId) throw new Error("Project ID and Activity ID must be provided.");
    const activityDocRef = doc(getDb(), `projects/${projectId}/activities`, activityId);
    await updateDoc(activityDocRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteActivity(projectId: string, activityId: string): Promise<void> {
    if (!projectId || !activityId) throw new Error("Project ID and Activity ID must be provided.");
    const activityDocRef = doc(getDb(), `projects/${projectId}/activities`, activityId);
    await deleteDoc(activityDocRef);
}


export async function addSubActivity(projectId: string, activityId: string, data: Omit<SubActivity, 'id' | 'doneWork' | 'approvedWork' | 'pendingWork' | 'workGradeA' | 'workGradeB' | 'workGradeC' | 'progressByZone' | 'plannedQuantity' | 'plannedStartDate' | 'plannedEndDate'>): Promise<void> {
    if (!projectId || !activityId) throw new Error("Project and Activity ID must be provided.");
    
    const db = getDb();

    await runTransaction(db, async (transaction) => {
        const activityRef = doc(db, `projects/${projectId}/activities`, activityId);
        const activitySnap = await transaction.get(activityRef);
        if (!activitySnap.exists()) {
            throw new Error(`Parent activity with ID ${activityId} does not exist.`);
        }
        const activityName = activitySnap.data().name;

        const subActivityRef = doc(collection(db, `projects/${projectId}/activities/${activityId}/subactivities`));
        const newSubActivity = {
            ...data,
            doneWork: 0,
            approvedWork: 0,
            pendingWork: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        transaction.set(subActivityRef, newSubActivity);
        
        const subActivitySummaryRef = doc(db, `projects/${projectId}/dashboards/${subActivityRef.id}`);
        const summaryData: SubActivitySummary = {
            totalWork: data.totalWork,
            doneWork: 0,
            pendingWork: 0,
            workGradeA: 0,
            workGradeB: 0,
            workGradeC: 0,
            unit: data.unit,
            activityName: activityName,
            subActivityName: data.name,
            BoQ: data.BoQ,
            updatedAt: serverTimestamp(),
        };
        transaction.set(subActivitySummaryRef, summaryData);

        const projectSummaryRef = doc(db, `projects/${projectId}/dashboards/summary`);
        transaction.update(projectSummaryRef, {
            subActivityCount: increment(1)
        });
    });
}


export async function updateSubActivity(projectId: string, activityId: string, subActivityId: string, data: Partial<SubActivity>): Promise<void> {
    if (!projectId || !activityId || !subActivityId) throw new Error("Project, Activity, and Sub-Activity IDs are required.");
    const subActivityDocRef = doc(getDb(), `projects/${projectId}/activities/${activityId}/subactivities`, subActivityId);
    await updateDoc(subActivityDocRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteSubActivity(projectId: string, activityId: string, subActivityId: string): Promise<void> {
    if (!projectId || !activityId || !subActivityId) throw new Error("Project, Activity, and Sub-Activity IDs are required.");
    const subActivityDocRef = doc(getDb(), `projects/${projectId}/activities/${activityId}/subactivities`, subActivityId);
    await deleteDoc(subActivityDocRef);
}

export async function approveDailyReport(projectId: string, reportId: string, grade: 'A' | 'B' | 'C') {
    const db = getDb();
    
    await runTransaction(db, async (transaction) => {
        const reportRef = doc(db, `projects/${projectId}/daily_reports/${reportId}`);
        const reportSnap = await transaction.get(reportRef);

        if (!reportSnap.exists() || reportSnap.data().status === 'Approved') {
            return;
        }

        const itemsQuery = collection(db, reportRef.path, 'items');
        const itemsSnap = await getDocs(itemsQuery);
        const reportItems = itemsSnap.docs.map(d => d.data() as ReportItem);
        
        const subActivitySummaryRefs = reportItems.map(item => doc(db, `projects/${projectId}/dashboards/${item.subActivityId}`));
        const subActivitySummarySnaps = await Promise.all(subActivitySummaryRefs.map(ref => transaction.get(ref)));

        const overallSummaryRef = doc(db, `projects/${projectId}/dashboards/summary`);
        const overallSummarySnap = await transaction.get(overallSummaryRef);

        let totalProgressChange = 0;

        for (let i = 0; i < reportItems.length; i++) {
            const item = reportItems[i];
            const summarySnap = subActivitySummarySnaps[i];

            if (!summarySnap.exists()) continue;

            const summaryData = summarySnap.data() as SubActivitySummary;
            
            const oldProgress = summaryData.totalWork > 0 ? (summaryData.doneWork / summaryData.totalWork) * 100 : 0;
            const newDoneWork = (summaryData.doneWork || 0) + item.quantity;
            const newProgress = summaryData.totalWork > 0 ? (newDoneWork / summaryData.totalWork) * 100 : 0;

            totalProgressChange += (newProgress - oldProgress);
        }

        transaction.update(reportRef, { status: 'Approved', updatedAt: serverTimestamp() });

        for(let i = 0; i < reportItems.length; i++) {
            const item = reportItems[i];
            const summaryRef = subActivitySummaryRefs[i];
            if (!subActivitySummarySnaps[i].exists()) continue;
            
            const gradeField = `workGrade${grade}`;
            const zoneName = item.zoneName;
            
            const updateData: { [key: string]: any } = {
                pendingWork: increment(-item.quantity),
                doneWork: increment(item.quantity),
                [gradeField]: increment(item.quantity),
                updatedAt: serverTimestamp()
            };

            if (zoneName) {
                updateData[`progressByZone.${zoneName}.pendingWork`] = increment(-item.quantity);
                updateData[`progressByZone.${zoneName}.doneWork`] = increment(item.quantity);
            }
            transaction.update(summaryRef, updateData);
        }
        
        if (overallSummarySnap.exists()) {
            const overallSummaryData = overallSummarySnap.data() as ProjectDashboardSummary;
            const newTotalProgressSum = (overallSummaryData.totalProgressSum || 0) + totalProgressChange;
            const newOverallProgress = overallSummaryData.subActivityCount > 0 ? newTotalProgressSum / overallSummaryData.subActivityCount : 0;

            transaction.update(overallSummaryRef, {
                totalProgressSum: newTotalProgressSum,
                overallProgress: newOverallProgress,
                lastReportAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }
    });
}

/**
 * Performs a two-way sync between SubActivity and SubActivitySummary documents.
 * 1. Ensures every SubActivity has a corresponding Summary.
 * 2. Deletes any orphaned Summary documents whose SubActivity has been deleted.
 */
export async function checkAndFixSubActivitySummaries(): Promise<{
  summariesChecked: number;
  summariesCreated: number;
  orphansFound: number;
  orphansDeleted: number;
}> {
    const db = getDb();
    const batch = writeBatch(db);
    let summariesChecked = 0;
    let summariesCreated = 0;
    let orphansFound = 0;
    let orphansDeleted = 0;

    const projectsSnapshot = await getDocs(collection(db, 'projects'));
    const allSubActivityIds = new Set<string>();

    // Forward check: Ensure summaries exist for every sub-activity
    for (const projectDoc of projectsSnapshot.docs) {
        const projectId = projectDoc.id;
        const activitiesSnapshot = await getDocs(collection(db, `projects/${projectId}/activities`));
        
        for (const activityDoc of activitiesSnapshot.docs) {
            const activityData = activityDoc.data() as Activity;
            const subActivitiesSnapshot = await getDocs(collection(activityDoc.ref, 'subactivities'));

            for (const subActivityDoc of subActivitiesSnapshot.docs) {
                const subActivityId = subActivityDoc.id;
                allSubActivityIds.add(subActivityId); // Keep track of all valid IDs
                summariesChecked++;
                const subActivityData = subActivityDoc.data() as SubActivity;

                const summaryRef = doc(db, `projects/${projectId}/dashboards/${subActivityId}`);
                const summarySnap = await getDoc(summaryRef);

                if (!summarySnap.exists()) {
                    summariesCreated++;
                    console.log(`Fixing missing summary for sub-activity: ${subActivityData.name} (${subActivityId})`);
                    
                    const zonesSnapshot = await getDocs(collection(db, `projects/${projectId}/zones`));
                    const progressByZone = zonesSnapshot.docs.reduce((acc: any, zoneDoc: any) => {
                        acc[zoneDoc.data().name] = { doneWork: 0, pendingWork: 0 };
                        return acc;
                    }, {});

                    const summaryData: SubActivitySummary = {
                        totalWork: subActivityData.totalWork,
                        doneWork: 0,
                        pendingWork: 0,
                        workGradeA: 0,
                        workGradeB: 0,
                        workGradeC: 0,
                        unit: subActivityData.unit,
                        activityName: activityData.name,
                        subActivityName: subActivityData.name,
                        BoQ: subActivityData.BoQ,
                        progressByZone: progressByZone,
                        updatedAt: serverTimestamp(),
                    };
                    batch.set(summaryRef, summaryData);
                }
            }
        }
    }

    // Reverse check: Find and delete orphaned summaries
    const dashboardSummariesSnapshot = await getDocs(collectionGroup(db, 'dashboards'));
    for (const summaryDoc of dashboardSummariesSnapshot.docs) {
        // We only care about sub-activity summaries, not the main 'summary' doc
        if (summaryDoc.id !== 'summary') {
            orphansFound++;
            if (!allSubActivityIds.has(summaryDoc.id)) {
                orphansDeleted++;
                console.log(`Deleting orphaned summary document: ${summaryDoc.ref.path}`);
                batch.delete(summaryDoc.ref);
            }
        }
    }

    if (summariesCreated > 0 || orphansDeleted > 0) {
        await batch.commit();
    }

    return { summariesChecked, summariesCreated, orphansFound, orphansDeleted };
}

/**
 * Migrates project members from a random ID to the user's UID for document IDs.
 * This aligns older data with current, more secure data structures.
 */
export async function migrateProjectMembersToUid(projectId: string): Promise<{ migratedCount: number }> {
    const db = getDb();
    const batch = writeBatch(db);
    let migratedCount = 0;

    // 1. Create a map from user name to UID from the /users collection
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const nameToUidMap = new Map<string, string>();
    usersSnapshot.forEach(userDoc => {
        const userData = userDoc.data() as User;
        if (userData.name) {
            nameToUidMap.set(userData.name, userDoc.id);
        }
    });

    // 2. Get all current members of the project
    const membersRef = collection(db, `projects/${projectId}/members`);
    const membersSnapshot = await getDocs(membersRef);

    for (const memberDoc of membersSnapshot.docs) {
        const memberData = memberDoc.data() as ProjectMember;
        const oldId = memberDoc.id;
        
        // Find the correct UID using the member's name
        const newUid = nameToUidMap.get(memberData.userName);

        // If a UID is found and it's different from the current doc ID, migrate.
        if (newUid && newUid !== oldId) {
            const newMemberRef = doc(db, `projects/${projectId}/members`, newUid);
            const oldMemberRef = doc(db, `projects/${projectId}/members`, oldId);

            // Set the new document with the correct UID
            batch.set(newMemberRef, memberData);
            // Delete the old document with the random ID
            batch.delete(oldMemberRef);
            
            migratedCount++;
        }
    }

    if (migratedCount > 0) {
        await batch.commit();
    }

    return { migratedCount };
}
