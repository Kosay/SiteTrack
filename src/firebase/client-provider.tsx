'use client';

import React, { useState, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // By using useState's initializer function, we guarantee that initializeFirebase()
  // is called only once, on the very first render of this component.
  // This prevents the "INTERNAL ASSERTION FAILED" error caused by re-initialization.
  const [firebaseServices] = useState(() => initializeFirebase());

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
