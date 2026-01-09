
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
  getDoc
} from 'firebase/firestore';
import { format } from 'date-fns';
import type { 
  Company, UserProfile, EquipmentType, Equipment, 
  Project, User, Invitation, Unit, Activity, 
  SubActivity, DailyReport, ReportItem, 
  ProjectDashboardSummary, SubActivitySummary 
} from './types';

// Helper to get Firestore instance
function getDb(): Firestore {
  return getFirestore();
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
  const totalWork = (formData.subActivities || []).reduce((acc: number, sa: any) => acc + (sa.totalWork || 0), 0);

  const projectData = {
    name: formData.name,
    companyId: formData.companyId,
    directorId: formData.directorId,
    pmId: formData.pmId,
    pmName: userMap.get(formData.pmId)?.name || 'Unknown',
    status: formData.status || 'Active',
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
          createdAt: serverTimestamp(),
        });
      }
    }
  });

  // 4. Add Activities and Sub-activities
  const activityMap = new Map<string, DocumentReference>();

  for (const act of formData.activities) {
    const actRef = doc(collection(db, `projects/${projectRef.id}/activities`));
    activityMap.set(act.code, actRef);
    batch.set(actRef, {
      name: act.name,
      code: act.code,
      totalWork: 0,
      createdAt: serverTimestamp(),
    });
  }

  for (const sa of formData.subActivities) {
    const actRef = activityMap.get(sa.activityCode);
    if (!actRef) continue;

    const saRef = doc(collection(db, actRef.path, 'subactivities'));
    batch.set(saRef, {
      name: sa.name,
      unit: sa.unit,
      totalWork: sa.totalWork,
      zoneQuantities: sa.zoneQuantities,
      createdAt: serverTimestamp(),
    });

    // Sub-activity specific dashboard entry
    const saSummaryRef = doc(db, `projects/${projectRef.id}/dashboards/${saRef.id}`);
    batch.set(saSummaryRef, {
      totalWork: sa.totalWork,
      doneWork: 0,
      pendingWork: 0,
      unit: sa.unit,
      subActivityName: sa.name,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
  return projectRef.id;
}

/**
 * DAILY REPORTING: ENSURES PROGRESS UPDATES ARE ATOMIC
 */
export async function createDailyReport(data: any): Promise<void> {
    const db = getDb();
    const { projectId, items, reportDate, ...header } = data;
    
    await runTransaction(db, async (transaction) => {
        const reportRef = doc(collection(db, `projects/${projectId}/daily_reports`));
        const diaryDate = format(reportDate, 'yyyyMMdd');

        transaction.set(reportRef, {
            ...header,
            reportDate,
            diaryDate,
            status: 'Pending',
            createdAt: serverTimestamp(),
        });

        for (const item of items) {
            const itemRef = doc(collection(db, reportRef.path, 'items'));
            transaction.set(itemRef, item);
            
            // Update Pending Work in Dashboard
            const summaryRef = doc(db, `projects/${projectId}/dashboards/${item.subActivityId}`);
            transaction.update(summaryRef, {
                pendingWork: increment(item.quantity),
                updatedAt: serverTimestamp()
            });
        }
    });
}

/**
 * GLOBAL DATA HELPERS (Companies, Units, Equipment)
 */
export async function addCompany(data: Partial<Company>): Promise<void> {
  const ref = doc(collection(getDb(), 'companies'));
  await setDoc(ref, { ...data, archived: false, createdAt: serverTimestamp() });
}

export async function addUnit(data: Partial<Unit>): Promise<void> {
  await addDoc(collection(getDb(), 'units'), { ...data, createdAt: serverTimestamp() });
}

export async function deleteUnit(unitId: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'units', unitId));
}

/**
 * Creates or overwrites a user profile document.
 * @param auth - The Firebase Auth instance (used for checking admin/permissions in a real app).
 * @param uid - The UID of the user whose profile is being created.
 * @param data - The user profile data.
 */
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
  const newUserProfile = {
    ...data,
    createdAt: serverTimestamp(), // Optional: to track when the profile was made
  };

  await setDoc(userProfileRef, newUserProfile, {});
}


/**
 * Updates an existing company in the global collection.
 * @param auth - The Firebase Auth instance.
 * @param companyId - The ID of the company to update.
 * @param data - The data to update.
 */
export async function updateCompany(
  auth: Auth,
  companyId: string,
  data: Partial<Company>
): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('User must be authenticated to update a company.');
  }

  const companyDocRef = doc(getDb(), 'companies', companyId);
  await updateDoc(companyDocRef, {
      ...data,
      updatedAt: serverTimestamp()
  });
}

type AddEquipmentTypeData = Omit<EquipmentType, 'id'>;

/**
 * Adds a new equipment type to the global list.
 * @param data - The equipment type data to add.
 */
export async function addEquipmentType(data: AddEquipmentTypeData): Promise<void> {
  const equipmentTypesCollectionRef = collection(getDb(), 'equipment_names');
  const newEquipmentType = {
    ...data,
    createdAt: serverTimestamp(),
  };
  await addDoc(equipmentTypesCollectionRef, newEquipmentType);
}

/**
 * Deletes an equipment type from the global list.
 * @param equipmentTypeId - The ID of the equipment type to delete.
 */
export async function deleteEquipmentType(equipmentTypeId: string): Promise<void> {
  if (!equipmentTypeId) {
    throw new Error('A valid Equipment Type ID must be provided.');
  }
  const equipmentTypeDocRef = doc(getDb(), 'equipment_names', equipmentTypeId);
  await deleteDoc(equipmentTypeDocRef);
}

type AddEquipmentData = Omit<Equipment, 'id'>;

/**
 * Adds a new piece of equipment to the global inventory.
 * @param data - The equipment data to add.
 */
export async function addEquipment(data: AddEquipmentData): Promise<void> {
  const equipmentCollectionRef = collection(getDb(), 'equipment');
  const newEquipment = {
    ...data,
    createdAt: serverTimestamp(),
  };
  await addDoc(equipmentCollectionRef, newEquipment);
}

/**
 * Adds multiple pieces of equipment in a single batch.
 * @param equipmentList - An array of equipment data to add.
 */
export async function batchAddEquipment(equipmentList: Omit<Equipment, 'id'>[]): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  const equipmentCollectionRef = collection(db, 'equipment');

  equipmentList.forEach(equipmentData => {
    const docRef = doc(equipmentCollectionRef); // Create a new doc with a random ID
    batch.set(docRef, equipmentData);
  });

  await batch.commit();
}


// Add a new function for creating projects
type AddProjectData = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'totalWork' | 'doneWork' | 'approvedWork'>;

/**
 * Adds a new project to the global collection.
 */
export async function addProject(data: AddProjectData): Promise<void> {
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

/**
 * Updates an existing project in the global collection.
 * @param projectId - The ID of the project to update.
 * @param data - The data to update.
 */
export async function updateProject(
  projectId: string,
  data: Partial<Project>
): Promise<void> {
  const projectDocRef = doc(getDb(), 'projects', projectId);
  await updateDoc(projectDocRef, {
      ...data,
      updatedAt: serverTimestamp()
  });
}

type CreateInvitationData = Omit<Invitation, 'id' | 'code' | 'status' | 'createdAt'>;

/**
 * Creates an invitation for a new user.
 */
export async function createInvitation(data: CreateInvitationData): Promise<void> {
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

/**
 * Updates an existing user in the global collection.
 * @param userId - The ID of the user to update.
 * @param data - The data to update.
 */
export async function updateUser(
  userId: string,
  data: Partial<Omit<User, 'id' | 'email'>>
): Promise<void> {
  const userDocRef = doc(getDb(), 'users', userId);
  await updateDoc(userDocRef, {
      ...data,
      updatedAt: serverTimestamp()
  });
}

type AddActivityData = Omit<Activity, 'id' | 'totalWork' | 'doneWork' | 'approvedWork' | 'pendingWork' | 'workGradeA' | 'workGradeB' | 'workGradeC' | 'plannedQuantity' | 'plannedStartDate' | 'plannedEndDate' >;

/**
 * Adds a new activity to a project's subcollection.
 * @param projectId The ID of the parent project.
 * @param data The activity data to add.
 */
export async function addActivity(projectId: string, data: AddActivityData): Promise<void> {
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

/**
 * Updates an existing activity within a project.
 * @param projectId The ID of the parent project.
 * @param activityId The ID of the activity to update.
 * @param data The partial data to update.
 */
export async function updateActivity(projectId: string, activityId: string, data: Partial<Activity>): Promise<void> {
    if (!projectId || !activityId) throw new Error("Project ID and Activity ID must be provided.");
    const activityDocRef = doc(getDb(), `projects/${projectId}/activities`, activityId);
    await updateDoc(activityDocRef, { ...data, updatedAt: serverTimestamp() });
}

/**
 * Deletes an activity from a project.
 * @param projectId The ID of the parent project.
 * @param activityId The ID of the activity to delete.
 */
export async function deleteActivity(projectId: string, activityId: string): Promise<void> {
    if (!projectId || !activityId) throw new Error("Project ID and Activity ID must be provided.");
    const activityDocRef = doc(getDb(), `projects/${projectId}/activities`, activityId);
    await deleteDoc(activityDocRef);
}


type AddSubActivityData = Omit<SubActivity, 'id' | 'doneWork' | 'approvedWork' | 'pendingWork' | 'workGradeA' | 'workGradeB' | 'workGradeC' | 'progressByZone' | 'plannedQuantity' | 'plannedStartDate' | 'plannedEndDate'>;

/**
 * Adds a new sub-activity (BoQ item) to an activity and creates its summary document.
 * @param projectId The ID of the parent project.
 * @param activityId The ID of the parent activity.
 * @param data The sub-activity data.
 */
export async function addSubActivity(projectId: string, activityId: string, data: AddSubActivityData): Promise<void> {
    if (!projectId || !activityId) throw new Error("Project and Activity ID must be provided.");
    
    const db = getDb();

    await runTransaction(db, async (transaction) => {
        // Get parent activity to denormalize name
        const activityRef = doc(db, `projects/${projectId}/activities`, activityId);
        const activitySnap = await transaction.get(activityRef);
        if (!activitySnap.exists()) {
            throw new Error(`Parent activity with ID ${activityId} does not exist.`);
        }
        const activityName = activitySnap.data().name;

        // 1. Create the SubActivity document
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
        
        // 2. Create the corresponding SubActivitySummary document
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

        // 3. Update the project-level summary
        const projectSummaryRef = doc(db, `projects/${projectId}/dashboards/summary`);
        transaction.update(projectSummaryRef, {
            subActivityCount: increment(1)
        });
    });
}


/**
 * Updates an existing sub-activity.
 * @param projectId The ID of the parent project.
 * @param activityId The ID of the parent activity.
 * @param subActivityId The ID of the sub-activity to update.
 * @param data The partial data for the sub-activity.
 */
export async function updateSubActivity(projectId: string, activityId: string, subActivityId: string, data: Partial<SubActivity>): Promise<void> {
    if (!projectId || !activityId || !subActivityId) throw new Error("Project, Activity, and Sub-Activity IDs are required.");
    const subActivityDocRef = doc(getDb(), `projects/${projectId}/activities/${activityId}/subactivities`, subActivityId);
    await updateDoc(subActivityDocRef, { ...data, updatedAt: serverTimestamp() });
}

/**
 * Deletes a sub-activity.
 * @param projectId The ID of the parent project.
 * @param activityId The ID of the parent activity.
 * @param subActivityId The ID of the sub-activity to delete.
 */
export async function deleteSubActivity(projectId: string, activityId: string, subActivityId: string): Promise<void> {
    if (!projectId || !activityId || !subActivityId) throw new Error("Project, Activity, and Sub-Activity IDs are required.");
    const subActivityDocRef = doc(getDb(), `projects/${projectId}/activities/${activityId}/subactivities`, subActivityId);
    await deleteDoc(subActivityDocRef);
}


/**
 * Approves a daily report and updates all relevant progress metrics.
 * This is a conceptual function that contains the logic for approvals.
 */
export async function approveDailyReport(projectId: string, reportId: string, grade: 'A' | 'B' | 'C') {
    const db = getDb();
    
    await runTransaction(db, async (transaction) => {
        // --- 1. READS ---
        const reportRef = doc(db, `projects/${projectId}/daily_reports/${reportId}`);
        const reportSnap = await transaction.get(reportRef);

        if (!reportSnap.exists() || reportSnap.data().status === 'Approved') {
            // Either report doesn't exist or has already been approved.
            return;
        }

        const itemsQuery = collection(db, reportRef.path, 'items');
        const itemsSnap = await getDocs(itemsQuery);
        const reportItems = itemsSnap.docs.map(d => d.data() as ReportItem);
        
        // Get all related summary documents
        const subActivitySummaryRefs = reportItems.map(item => doc(db, `projects/${projectId}/dashboards/${item.subActivityId}`));
        const subActivitySummarySnaps = await Promise.all(subActivitySummaryRefs.map(ref => transaction.get(ref)));

        const overallSummaryRef = doc(db, `projects/${projectId}/dashboards/summary`);
        const overallSummarySnap = await transaction.get(overallSummaryRef);

        // --- 2. LOGIC ---
        let totalProgressChange = 0;

        for (let i = 0; i < reportItems.length; i++) {
            const item = reportItems[i];
            const summarySnap = subActivitySummarySnaps[i];

            if (!summarySnap.exists()) continue;

            const summaryData = summarySnap.data() as SubActivitySummary;
            
            // Calculate progress change for this item
            const oldProgress = summaryData.totalWork > 0 ? (summaryData.doneWork / summaryData.totalWork) * 100 : 0;
            const newDoneWork = (summaryData.doneWork || 0) + item.quantity;
            const newProgress = summaryData.totalWork > 0 ? (newDoneWork / summaryData.totalWork) * 100 : 0;

            totalProgressChange += (newProgress - oldProgress);
        }

        // --- 3. WRITES ---
        // Mark report as approved
        transaction.update(reportRef, { status: 'Approved', updatedAt: serverTimestamp() });

        // Update each sub-activity summary
        for(let i = 0; i < reportItems.length; i++) {
            const item = reportItems[i];
            const summaryRef = subActivitySummaryRefs[i];
            if (!subActivitySummarySnaps[i].exists()) continue;
            
            const gradeField = `workGrade${grade}`;
            transaction.update(summaryRef, {
                pendingWork: increment(-item.quantity),
                doneWork: increment(item.quantity),
                [gradeField]: increment(item.quantity),
                updatedAt: serverTimestamp()
            });
        }
        
        // Update the single top-level dashboard summary
        if (overallSummarySnap.exists()) {
            const overallSummaryData = overallSummarySnap.data() as ProjectDashboardSummary;
            const newTotalProgressSum = (overallSummaryData.totalProgressSum || 0) + totalProgressChange;
            const newOverallProgress = overallSummaryData.subActivityCount > 0 ? newTotalProgressSum / overallSummaryData.subActivityCount : 0;

            transaction.update(overallSummaryRef, {
                totalProgressSum: newTotalProgressSum,
                overallProgress: newOverallProgress,
                lastReportAt: serverTimestamp(), // Use approval time as last report time
                updatedAt: serverTimestamp()
            });
        }
    });
}


/**
 * Scans all daily reports and recalculates all sub-activity summaries from scratch.
 * This is a developer tool to fix data inconsistencies.
 */
export async function checkAndFixSubActivitySummaries(): Promise<{ summariesChecked: number; summariesFixed: number }> {
    const db = getDb();
    
    // A map to hold the "correct" calculated values for each summary
    const calculatedSummaries: Map<string, Omit<SubActivitySummary, 'totalWork' | 'unit' | 'activityName' | 'subActivityName' | 'BoQ'>> = new Map();

    // 1. Aggregate all data from all daily reports
    const reportsQuery = collectionGroup(db, 'daily_reports');
    const reportsSnapshot = await getDocs(reportsQuery);

    for (const reportDoc of reportsSnapshot.docs) {
        const report = reportDoc.data() as DailyReport;
        
        // We only care about reports that have been processed.
        const isApproved = report.status === 'Approved';

        const itemsSnapshot = await getDocs(collection(reportDoc.ref, 'items'));
        for (const itemDoc of itemsSnapshot.docs) {
            const item = itemDoc.data() as ReportItem;
            const summaryId = item.subActivityId;

            // Initialize if not present
            if (!calculatedSummaries.has(summaryId)) {
                calculatedSummaries.set(summaryId, {
                    doneWork: 0,
                    pendingWork: 0,
                    workGradeA: 0,
                    workGradeB: 0,
                    workGradeC: 0,
                    updatedAt: serverTimestamp(),
                });
            }

            const current = calculatedSummaries.get(summaryId)!;
            
            if (isApproved) {
                // This is a placeholder for grade. In a real scenario, the grade would be on the report or item.
                // For now, let's assume 'A' for all approved items for the fix.
                current.doneWork += item.quantity;
                current.workGradeA += item.quantity;
            } else { // 'Pending'
                current.pendingWork += item.quantity;
            }
        }
    }

    // 2. Compare and fix all SubActivitySummary documents
    let summariesChecked = 0;
    let summariesFixed = 0;
    const batch = writeBatch(db);

    const summariesQuery = collectionGroup(db, 'dashboards');
    const summariesSnapshot = await getDocs(summariesQuery);

    for (const summaryDoc of summariesSnapshot.docs) {
        // Skip the project-level 'summary' document
        if (summaryDoc.id === 'summary') continue;
        
        summariesChecked++;
        const summaryId = summaryDoc.id;
        const currentSummary = summaryDoc.data() as SubActivitySummary;
        const calculated = calculatedSummaries.get(summaryId);

        // If we have calculated values for this summary, check for inconsistency
        if (calculated) {
            if (currentSummary.doneWork !== calculated.doneWork ||
                currentSummary.pendingWork !== calculated.pendingWork ||
                currentSummary.workGradeA !== calculated.workGradeA) {
                
                summariesFixed++;
                batch.update(summaryDoc.ref, {
                    ...calculated,
                    updatedAt: serverTimestamp(),
                });
            }
             // Remove from map to track summaries that exist in reports but not in dashboards
            calculatedSummaries.delete(summaryId);
        } else {
            // This summary exists, but no reports reference it. Reset its values.
             if (currentSummary.doneWork !== 0 || currentSummary.pendingWork !== 0) {
                 summariesFixed++;
                 batch.update(summaryDoc.ref, {
                    doneWork: 0,
                    pendingWork: 0,
                    workGradeA: 0,
                    workGradeB: 0,
                    workGradeC: 0,
                    updatedAt: serverTimestamp(),
                 });
             }
        }
    }

    if (calculatedSummaries.size > 0) {
        console.warn(`${calculatedSummaries.size} summaries had report data but no corresponding dashboard document. These were not fixed.`);
    }
    
    if (summariesFixed > 0) {
        await batch.commit();
    }
    
    return { summariesChecked, summariesFixed };
}
