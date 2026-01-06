'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// Placeholder components for each step
const Step1 = () => <div><CardTitle>Step 1: Project Basics</CardTitle><CardDescription>Enter company, name, address...</CardDescription></div>;
const Step2 = () => <div><CardTitle>Step 2: Select Director & PM</CardTitle></div>;
const Step3 = () => <div><CardTitle>Step 3: Select CM & Engineers</CardTitle></div>;
const Step4 = () => <div><CardTitle>Step 4: Select Other Users</CardTitle></div>;
const Step5 = () => <div><CardTitle>Step 5: Define Units</CardTitle></div>;
const Step6 = () => <div><CardTitle>Step 6: Define Zones</CardTitle></div>;
const Step7 = () => <div><CardTitle>Step 7: Define Activities</CardTitle></div>;
const Step8 = () => <div><CardTitle>Step 8: Define Sub-activities & Quantities</CardTitle></div>;
const Step9 = () => <div><CardTitle>Step 9: Review & Save</CardTitle></div>;


const steps = [
  { name: 'Basics', component: Step1 },
  { name: 'Leadership', component: Step2 },
  { name: 'Team', component: Step3 },
  { name: 'Support', component: Step4 },
  { name: 'Units', component: Step5 },
  { name: 'Zones', component: Step6 },
  { name: 'Activities', component: Step7 },
  { name: 'Sub-activities', component: Step8 },
  { name: 'Review', component: Step9 },
];

export default function NewProjectWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const CurrentStepComponent = steps[currentStep].component;

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
          <h1 className="text-3xl font-bold tracking-tight">New Project Wizard</h1>
          <p className="text-muted-foreground">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].name}
          </p>
        </div>
      </header>

      <div className="flex justify-center">
        <div className="w-full max-w-4xl">
          <Card>
            <CardHeader>
              {/* The title is now inside the step component */}
            </CardHeader>
            <CardContent>
              <CurrentStepComponent />
            </CardContent>
            <CardFooter className="flex justify-between">
              {currentStep > 0 ? (
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-2" /> Back
                </Button>
              ) : <div />}
              
              {currentStep < steps.length - 1 ? (
                <Button onClick={handleNext}>
                  Next <ArrowRight className="ml-2" />
                </Button>
              ) : (
                <Button>Review & Save</Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
