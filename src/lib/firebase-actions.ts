
'use client';

import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  type Auth,
  type Firestore,
  setDoc,
  deleteDoc,
  WriteBatch,
  writeBatch,
} from 'firebase/firestore';
import type { Company, ProgressLog, UserProfile, EquipmentType, Equipment, Project, User, Invitation, Unit, Activity, SubActivity } from './types';
import { addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { getFirestore } from 'firebase/firestore';

// Helper to get Firestore instance
function getDb(): Firestore {
  return getFirestore();
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

  // Use setDoc to create a document with a specific ID (the UID)
  setDocumentNonBlocking(userProfileRef, newUserProfile, {});
}


type AddProgressLogData = Omit<ProgressLog, 'id' | 'logDate'>;

/**
 * Adds a new progress log to a construction activity for the current user.
 * @param auth - The Firebase Auth instance.
 * @param data - The progress log data to add.
 */
export async function addProgressLog(
  auth: Auth,
  data: AddProgressLogData
): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error('User must be authenticated to log progress.');
  }

  const { activityId, ...logData } = data;

  const logsCollectionRef = collection(
    getDb(),
    `users/${userId}/constructionActivities/${activityId}/progressLogs`
  );

  const newLog = {
    ...logData,
    activityId: activityId,
    logDate: serverTimestamp(),
  };

  // Using non-blocking update
  addDocumentNonBlocking(logsCollectionRef, newLog);
}

type AddCompanyData = Omit<Company, 'id' | 'archived' | 'directorId' | 'pmId' | 'createdAt' | 'updatedAt'>;

/**
 * Adds a new company to the global collection.
 * @param auth - The Firebase Auth instance.
 * @param data - The company data to add.
 */
export async function addCompany(
  auth: Auth,
  data: AddCompanyData
): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('User must be authenticated to add a company.');
  }

  const companiesCollectionRef = collection(getDb(), 'companies');
  const newCompany = {
    ...data,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  addDocumentNonBlocking(companiesCollectionRef, newCompany);
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
  updateDocumentNonBlocking(companyDocRef, {
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
  addDocumentNonBlocking(equipmentTypesCollectionRef, newEquipmentType);
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
  deleteDocumentNonBlocking(equipmentTypeDocRef);
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
  addDocumentNonBlocking(equipmentCollectionRef, newEquipment);
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
  addDocumentNonBlocking(projectsCollectionRef, newProject);
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
  updateDocumentNonBlocking(projectDocRef, {
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

  await addDocumentNonBlocking(invitationsCollectionRef, newInvitation);
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
  updateDocumentNonBlocking(userDocRef, {
      ...data,
      updatedAt: serverTimestamp()
  });
}

type AddUnitData = Omit<Unit, 'id'>;

/**
 * Adds a new global unit of measurement.
 * @param data - The unit data to add.
 */
export async function addUnit(data: AddUnitData): Promise<void> {
  const unitsCollectionRef = collection(getDb(), 'units');
  addDocumentNonBlocking(unitsCollectionRef, { ...data, createdAt: serverTimestamp() });
}

/**
 * Deletes a global unit of measurement.
 * @param unitId - The ID of the unit to delete.
 */
export async function deleteUnit(unitId: string): Promise<void> {
    if (!unitId) throw new Error('A valid Unit ID must be provided.');
    const unitDocRef = doc(getDb(), 'units', unitId);
    deleteDocumentNonBlocking(unitDocRef);
}


type AddActivityData = Omit<Activity, 'id' | 'totalWork' | 'doneWork' | 'approvedWork'>;

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


type AddSubActivityData = Omit<SubActivity, 'id'>;

/**
 * Adds a new sub-activity (BoQ item) to an activity.
 * @param projectId The ID of the parent project.
 * @param activityId The ID of the parent activity.
 * @param data The sub-activity data.
 */
export async function addSubActivity(projectId: string, activityId: string, data: AddSubActivityData): Promise<void> {
    if (!projectId || !activityId) throw new Error("Project and Activity ID must be provided.");
    const subActivitiesRef = collection(getDb(), `projects/${projectId}/activities/${activityId}/subactivities`);
    const newSubActivity = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    await addDoc(subActivitiesRef, newSubActivity);
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
