'use client';

import {
  addDoc,
  collection,
  doc,
  getFirestore,
  serverTimestamp,
  updateDoc,
  type Auth,
  type Firestore,
} from 'firebase/firestore';
import type { Company, ProgressLog } from './types';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';

// Helper to get Firestore instance
function getDb(): Firestore {
  return getFirestore();
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

type AddCompanyData = Omit<Company, 'id' | 'archived'>;

/**
 * Adds a new company for the current user.
 * @param auth - The Firebase Auth instance.
 * @param data - The company data to add.
 */
export async function addCompany(
  auth: Auth,
  data: AddCompanyData
): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error('User must be authenticated to add a company.');
  }

  const companiesCollectionRef = collection(getDb(), `users/${userId}/companies`);
  const newCompany = {
    ...data,
    archived: false,
    createdAt: serverTimestamp(),
  };

  addDocumentNonBlocking(companiesCollectionRef, newCompany);
}

/**
 * Updates an existing company for the current user.
 * @param auth - The Firebase Auth instance.
 * @param companyId - The ID of the company to update.
 * @param data - The data to update.
 */
export async function updateCompany(
  auth: Auth,
  companyId: string,
  data: Partial<Company>
): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error('User must be authenticated to update a company.');
  }

  const companyDocRef = doc(getDb(), `users/${userId}/companies`, companyId);
  updateDocumentNonBlocking(companyDocRef, data);
}
