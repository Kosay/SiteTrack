import { ProgressForm } from '@/components/progress-form';

export default function ProgressPage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Log Progress</h1>
        <p className="text-muted-foreground">
          Submit an update with a description and image for safety analysis.
        </p>
      </header>
      <div className="w-full max-w-4xl mx-auto">
        <ProgressForm />
      </div>
    </div>
  );
}
