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
 */
export async function createDailyReport(data: any): Promise<void> {
    const db = getDb();
    const { projectId, items, reportDate, ...header } = data;
    
    await runTransaction(db, async (transaction) => {
        const reportRef = doc(collection(db, `projects/${projectId}/daily_reports`));
        const diaryDate = format(reportDate, 'yyyyMMdd');

        // 1. Create the main report document
        transaction.set(reportRef, {
            ...header,
            reportDate,
            diaryDate,
            status: 'Pending',
            createdAt: serverTimestamp(),
        });

        // 2. Loop through each item, get its summary, and update it.
        for (const item of items) {
            // Write the individual report item
            const itemRef = doc(collection(db, reportRef.path, 'items'));
            transaction.set(itemRef, item);
            
            const summaryRef = doc(db, `projects/${projectId}/dashboards/${item.subActivityId}`);
            const summarySnap = await transaction.get(summaryRef);
            
            if (summarySnap.exists()) {
                const zoneName = item.zoneName;
                const updateData: { [key: string]: any } = {
                    pendingWork: increment(item.quantity),
                    updatedAt: serverTimestamp()
                };

                // Use dot notation for nested map updates if zone exists
                if (zoneName) {
                    updateData[`progressByZone.${zoneName}.pendingWork`] = increment(item.quantity);
                }
                
                transaction.update(summarySnap.ref, updateData);
            } else {
                 // Failsafe: if the summary doc doesn't exist, log an error but don't crash the transaction.
                 // This allows other valid items in the report to be processed.
                 console.error(`SubActivitySummary for ID ${item.subActivityId} not found. Cannot update pending work.`);
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

export async function checkAndFixSubActivitySummaries(): Promise<{ summariesChecked: number; summariesFixed: number }> {
    const db = getDb();
    
    const calculatedSummaries: Map<string, Partial<SubActivitySummary>> = new Map();

    const reportsQuery = collectionGroup(db, 'daily_reports');
    const reportsSnapshot = await getDocs(reportsQuery);

    for (const reportDoc of reportsSnapshot.docs) {
        const report = reportDoc.data() as DailyReport;
        const isApproved = report.status === 'Approved';

        const itemsSnapshot = await getDocs(collection(reportDoc.ref, 'items'));
        for (const itemDoc of itemsSnapshot.docs) {
            const item = itemDoc.data() as ReportItem;
            const summaryId = item.subActivityId;

            if (!calculatedSummaries.has(summaryId)) {
                calculatedSummaries.set(summaryId, {
                    doneWork: 0,
                    pendingWork: 0,
                    workGradeA: 0,
                    workGradeB: 0,
                    workGradeC: 0,
                    progressByZone: {}
                });
            }

            const current = calculatedSummaries.get(summaryId)!;
            const zoneName = item.zoneName;

            if (isApproved) {
                current.doneWork = (current.doneWork || 0) + item.quantity;
                current.workGradeA = (current.workGradeA || 0) + item.quantity; // Assuming Grade A for now
                 if (zoneName) {
                    if (!current.progressByZone![zoneName]) current.progressByZone![zoneName] = { doneWork: 0, pendingWork: 0 };
                    current.progressByZone![zoneName].doneWork += item.quantity;
                }
            } else { // 'Pending'
                current.pendingWork = (current.pendingWork || 0) + item.quantity;
                 if (zoneName) {
                    if (!current.progressByZone![zoneName]) current.progressByZone![zoneName] = { doneWork: 0, pendingWork: 0 };
                    current.progressByZone![zoneName].pendingWork += item.quantity;
                }
            }
        }
    }

    let summariesChecked = 0;
    let summariesFixed = 0;
    const batch = writeBatch(db);

    const summariesQuery = collectionGroup(db, 'dashboards');
    const summariesSnapshot = await getDocs(summariesQuery);

    for (const summaryDoc of summariesSnapshot.docs) {
        if (summaryDoc.id === 'summary') continue;
        
        summariesChecked++;
        const summaryId = summaryDoc.id;
        const currentSummary = summaryDoc.data() as SubActivitySummary;
        const calculated = calculatedSummaries.get(summaryId) || { doneWork: 0, pendingWork: 0, workGradeA: 0, workGradeB: 0, workGradeC: 0, progressByZone: {} };

        let needsFix = false;
        if (currentSummary.doneWork !== calculated.doneWork ||
            currentSummary.pendingWork !== calculated.pendingWork) {
            needsFix = true;
        }
        
        // Also check zone data
        const currentZones = Object.keys(currentSummary.progressByZone || {});
        const calculatedZones = Object.keys(calculated.progressByZone || {});
        if (currentZones.length !== calculatedZones.length) {
            needsFix = true;
        } else {
            for (const zone of currentZones) {
                if (!calculated.progressByZone?.[zone] ||
                    currentSummary.progressByZone?.[zone].doneWork !== calculated.progressByZone?.[zone].doneWork ||
                    currentSummary.progressByZone?.[zone].pendingWork !== calculated.progressByZone?.[zone].pendingWork) {
                    needsFix = true;
                    break;
                }
            }
        }


        if (needsFix) {
            summariesFixed++;
            batch.update(summaryDoc.ref, {
                ...calculated,
                updatedAt: serverTimestamp(),
            });
        }
        calculatedSummaries.delete(summaryId);
    }
    
    if (calculatedSummaries.size > 0) {
        console.warn(`${calculatedSummaries.size} summaries had report data but no corresponding dashboard document. These were not fixed.`);
    }
    
    if (summariesFixed > 0) {
        await batch.commit();
    }
    
    return { summariesChecked, summariesFixed };
}
