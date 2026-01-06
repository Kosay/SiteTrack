'use client';

import {
  addDoc,
  collection,
  serverTimestamp,
  type Auth,
  type Firestore,
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseApp } from '@/firebase/provider';
import type { ProgressLog } from './types';
import { addDocumentNonBlocking } from '@/firebase';

// Helper to get Firestore instance
function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
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
