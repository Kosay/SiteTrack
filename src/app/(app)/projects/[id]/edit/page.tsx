'use client';

import Link from 'next/link';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function EditProjectPage() {

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/projects">
            <ArrowLeft />
            <span className="sr-only">Back to Projects</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Project</h1>
          <p className="text-muted-foreground">
            Update project details below.
          </p>
        </div>
      </header>
      
      <Card>
        <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>This page is under construction.</CardDescription>
        </CardHeader>
        <CardContent>
            <p>The ability to edit project details will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
