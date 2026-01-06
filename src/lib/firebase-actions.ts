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
import type { Company, ProgressLog, UserProfile, EquipmentType, Equipment, Project, User } from './types';
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

type AddCompanyData = Omit<Company, 'id' | 'archived' | 'directorId' | 'pmId'>;

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
  updateDocumentNonBlocking(companyDocRef, data);
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

