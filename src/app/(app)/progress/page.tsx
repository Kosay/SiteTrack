
'use client';

import { ProgressForm } from '@/components/progress-form';
import { useFirestoreData } from '@/lib/hooks/use-firestore-data';
import { LoaderCircle } from 'lucide-react';

export default function ProgressPage() {

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Log Safety Observation</h1>
        <p className="text-muted-foreground">
          Submit an observation with a description and image for safety analysis.
        </p>
      </header>
      <div className="w-full max-w-4xl mx-auto">
        <ProgressForm />
      </div>
    </div>
  );
}
