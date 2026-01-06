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
import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Company } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Step 1 Component
const Step1_ProjectBasics = ({ formData, setFormData, companies, isLoadingCompanies }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name, value) => {
      setFormData(prev => ({...prev, [name]: value}));
  }

  return (
    <div className="space-y-6">
       <CardHeader className="p-0">
        <CardTitle>Step 1: Project Basics</CardTitle>
        <CardDescription>
          Start by selecting the managing company and entering the primary details for your new project.
        </CardDescription>
      </CardHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
            <Label htmlFor="companyId">Managing Company</Label>
            {isLoadingCompanies ? <LoaderCircle className="animate-spin" /> :
                <Select name="companyId" value={formData.companyId || ''} onValueChange={(value) => handleSelectChange('companyId', value)}>
                    <SelectTrigger id="companyId">
                    <SelectValue placeholder="Select a company" />
                    </SelectTrigger>
                    <SelectContent>
                    {companies?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            }
        </div>
         <div className="space-y-2">
          <Label htmlFor="name">Project Name</Label>
          <Input id="name" name="name" placeholder="e.g., 'Downtown Skyscraper'" value={formData.name || ''} onChange={handleChange} required />
        </div>
      </div>
      
       <div className="space-y-2">
          <Label htmlFor="address">Project Address</Label>
          <Input id="address" name="address" placeholder="e.g., '123 Innovation Drive, Metropolis'" value={formData.address || ''} onChange={handleChange} />
        </div>
      
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
            <Label htmlFor="googleMapsUrl">Google Maps URL (Optional)</Label>
            <Input id="googleMapsUrl" name="googleMapsUrl" type="url" placeholder="https://maps.app.goo.gl/..." value={formData.googleMapsUrl || ''} onChange={handleChange} />
        </div>
         <div className="space-y-2">
            <Label htmlFor="kmlUrl">KML File URL (Optional)</Label>
            <Input id="kmlUrl" name="kmlUrl" type="url" placeholder="https://example.com/project.kml" value={formData.kmlUrl || ''} onChange={handleChange} />
        </div>
      </div>
    </div>
  );
};


// Placeholder components for other steps
const Step2 = () => <div><CardTitle>Step 2: Select Director & PM</CardTitle></div>;
const Step3 = () => <div><CardTitle>Step 3: Select CM & Engineers</CardTitle></div>;
const Step4 = () => <div><CardTitle>Step 4: Select Other Users</CardTitle></div>;
const Step5 = () => <div><CardTitle>Step 5: Define Units</CardTitle></div>;
const Step6 = () => <div><CardTitle>Step 6: Define Zones</CardTitle></div>;
const Step7 = () => <div><CardTitle>Step 7: Define Activities</CardTitle></div>;
const Step8 = () => <div><CardTitle>Step 8: Define Sub-activities & Quantities</CardTitle></div>;
const Step9 = () => <div><CardTitle>Step 9: Review & Save</CardTitle></div>;


export default function NewProjectWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const firestore = useFirestore();

  const companiesCollection = useMemoFirebase(() => collection(firestore, 'companies'), [firestore]);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesCollection);

  const steps = [
    { name: 'Basics', component: (props) => <Step1_ProjectBasics {...props} /> },
    { name: 'Leadership', component: Step2 },
    { name: 'Team', component: Step3 },
    { name: 'Support', component: Step4 },
    { name: 'Units', component: Step5 },
    { name: 'Zones', component: Step6 },
    { name: 'Activities', component: Step7 },
    { name: 'Sub-activities', component: Step8 },
    { name: 'Review', component: Step9 },
  ];

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const CurrentStepComponent = steps[currentStep].component;

  const componentProps = {
    formData,
    setFormData,
    companies,
    isLoadingCompanies,
  };

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
            <CardContent className="pt-6">
              <CurrentStepComponent {...componentProps} />
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
