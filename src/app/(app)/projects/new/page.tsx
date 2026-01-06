
'use client';

import { useState, useMemo, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, ArrowRight, LoaderCircle, PlusCircle, Trash2, User as UserIcon, Check, Settings } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Company, User, Unit } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { addUnit } from '@/lib/firebase-actions';

// Step 1 Component
const Step1_ProjectBasics = ({ formData, companies, isLoadingCompanies, handleChange, handleSelectChange }) => {

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


// Step 2 Component
const Step2_Leadership = ({ formData, users, isLoadingUsers, handleSelectChange }) => {
    const directors = useMemo(() => users?.filter(u => u.position === 'Director') || [], [users]);
    const projectManagers = useMemo(() => users?.filter(u => u.position === 'PM') || [], [users]);

    return (
        <div className="space-y-6">
            <CardHeader className="p-0">
                <CardTitle>Step 2: Select Leadership</CardTitle>
                <CardDescription>
                    Assign the key leadership roles for this project.
                </CardDescription>
            </CardHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="directorId">Project Director</Label>
                    {isLoadingUsers ? <LoaderCircle className="animate-spin" /> :
                        <Select name="directorId" value={formData.directorId || ''} onValueChange={(value) => handleSelectChange('directorId', value)}>
                            <SelectTrigger id="directorId">
                                <SelectValue placeholder="Select a director" />
                            </SelectTrigger>
                            <SelectContent>
                                {directors.map((d) => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    }
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="pmId">Project Manager (PM)</Label>
                    {isLoadingUsers ? <LoaderCircle className="animate-spin" /> :
                        <Select name="pmId" value={formData.pmId || ''} onValueChange={(value) => handleSelectChange('pmId', value)}>
                            <SelectTrigger id="pmId">
                                <SelectValue placeholder="Select a project manager" />
                            </SelectTrigger>
                            <SelectContent>
                                {projectManagers.map((pm) => (
                                    <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    }
                </div>
            </div>
        </div>
    );
};

// Reusable User Selection Dialog
function UserSelectionDialog({ users, onSelect, title, triggerButton }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Search user..." />
          <CommandEmpty>No users found.</CommandEmpty>
          <CommandGroup>
            {users.map((user) => (
              <CommandItem
                key={user.id}
                value={user.name}
                onSelect={() => {
                  onSelect(user.id);
                  setOpen(false);
                }}
              >
                <UserIcon className={cn('mr-2 h-4 w-4')} />
                {user.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </DialogContent>
    </Dialog>
  );
}


// Step 3 Component
const Step3_Team = ({ formData, users, isLoadingUsers, handleMultiSelectChange, userMap }) => {
    const constructionManagers = useMemo(() => users?.filter(u => u.position === 'CM') || [], [users]);
    const engineers = useMemo(() => users?.filter(u => u.position === 'Engineer') || [], [users]);

    const addRoleMember = (role, userId) => {
        const currentIds = formData[role] || [];
        if (!currentIds.includes(userId)) {
            handleMultiSelectChange(role, [...currentIds, userId]);
        }
    };

    const removeRoleMember = (role, userId) => {
        const currentIds = formData[role] || [];
        handleMultiSelectChange(role, currentIds.filter(id => id !== userId));
    };

    const watchedCmIds = formData.cmIds || [];
    const watchedEngineerIds = formData.engineerIds || [];

    if (isLoadingUsers) {
      return <LoaderCircle className="animate-spin" />
    }

    return (
        <div className="space-y-6">
            <CardHeader className="p-0">
                <CardTitle>Step 3: Select CM & Engineers</CardTitle>
                <CardDescription>
                    Assign the on-site construction managers and engineers.
                </CardDescription>
            </CardHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <Label className="flex items-center justify-between">
                        <span>Construction Managers (CMs)</span>
                        <UserSelectionDialog 
                            users={constructionManagers.filter(c => !watchedCmIds.includes(c.id))}
                            title="Add Construction Manager" 
                            onSelect={(userId) => addRoleMember('cmIds', userId)}
                            triggerButton={<Button variant="ghost" size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>}
                        />
                    </Label>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {watchedCmIds.length > 0 ? watchedCmIds.map(userId => (
                         <div key={userId} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                            <div className="flex items-center gap-3">
                                <UserIcon className="h-5 w-5 text-muted-foreground" />
                                <span className="text-sm font-medium">{userMap.get(userId) || 'Unknown User'}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRoleMember('cmIds', userId)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                      )) : <p className="text-sm text-muted-foreground text-center py-2">No CMs assigned.</p>}
                    </div>
                </div>

                 <div className="space-y-3">
                    <Label className="flex items-center justify-between">
                        <span>Engineers</span>
                        <UserSelectionDialog 
                            users={engineers.filter(e => !watchedEngineerIds.includes(e.id))}
                            title="Add Engineer" 
                            onSelect={(userId) => addRoleMember('engineerIds', userId)}
                            triggerButton={<Button variant="ghost" size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>}
                        />
                    </Label>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {watchedEngineerIds.length > 0 ? watchedEngineerIds.map(userId => (
                         <div key={userId} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                            <div className="flex items-center gap-3">
                                <UserIcon className="h-5 w-5 text-muted-foreground" />
                                <span className="text-sm font-medium">{userMap.get(userId) || 'Unknown User'}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRoleMember('engineerIds', userId)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                      )) : <p className="text-sm text-muted-foreground text-center py-2">No engineers assigned.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Reusable Role Selection Card
const RoleSelectionCard = ({ roleName, roleKey, allUsers, selectedIds, onAdd, onRemove, userMap }) => {
    const availableUsers = useMemo(() => {
        const filtered = allUsers.filter(u => !selectedIds.includes(u.id));
        return filtered;
    }, [allUsers, selectedIds]);

    return (
        <div className="space-y-3">
            <Label className="flex items-center justify-between">
                <span>{roleName}</span>
                <UserSelectionDialog 
                    users={availableUsers}
                    title={`Add ${roleName.slice(0, -1)}`}
                    onSelect={(userId) => onAdd(roleKey, userId)}
                    triggerButton={<Button variant="ghost" size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>}
                />
            </Label>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {selectedIds.length > 0 ? selectedIds.map(userId => (
                 <div key={userId} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                    <div className="flex items-center gap-3">
                        <UserIcon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">{userMap.get(userId) || 'Unknown User'}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(roleKey, userId)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
              )) : <p className="text-sm text-muted-foreground text-center py-2">No users assigned.</p>}
            </div>
        </div>
    );
}

// Step 4 Component
const Step4_Support = ({ formData, users, isLoadingUsers, handleMultiSelectChange, userMap }) => {
    
    const roles = [
        { name: 'Safety Officers', key: 'safetyOfficerIds', position: 'Safety Officer' },
        { name: 'Document Controllers', key: 'docControllerIds', position: 'Document Controller' },
        { name: 'Logistics', key: 'logisticIds', position: 'Logistic' },
    ];
    
    const usersByRole = useMemo(() => {
        const result = {};
        roles.forEach(role => {
            result[role.key] = users?.filter(u => u.position === role.position) || [];
        });
        return result;
    }, [users]);
    
    const addRoleMember = (roleKey, userId) => {
        const currentIds = formData[roleKey] || [];
        if (!currentIds.includes(userId)) {
            handleMultiSelectChange(roleKey, [...currentIds, userId]);
        }
    };

    const removeRoleMember = (roleKey, userId) => {
        const currentIds = formData[roleKey] || [];
        handleMultiSelectChange(roleKey, currentIds.filter(id => id !== userId));
    };

    if (isLoadingUsers) return <LoaderCircle className="animate-spin" />;

    return (
         <div className="space-y-6">
            <CardHeader className="p-0">
                <CardTitle>Step 4: Select Support Staff (Optional)</CardTitle>
                <CardDescription>
                    Assign other key personnel for support roles on this project. You can skip this step.
                </CardDescription>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {roles.map(role => (
                    <RoleSelectionCard 
                        key={role.key}
                        roleName={role.name}
                        roleKey={role.key}
                        allUsers={usersByRole[role.key]}
                        selectedIds={formData[role.key] || []}
                        onAdd={addRoleMember}
                        onRemove={removeRoleMember}
                        userMap={userMap}
                    />
                ))}
            </div>
         </div>
    );
};


function AddUnitForm({ onSuccess }: { onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;

    if (!name) {
      toast({ variant: 'destructive', title: 'Unit name is required.' });
      setIsSubmitting(false);
      return;
    }
    try {
      await addUnit({ name });
      toast({ title: 'Unit Created', description: `${name} has been added.` });
      onSuccess();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to create unit', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Unit Name</Label>
        <Input id="name" name="name" placeholder="e.g., 'm³', 'Linear Meter', 'ton'" required />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
          Create Unit
        </Button>
      </DialogFooter>
    </form>
  );
}

const Step5_DefineUnits = ({ formData, units, isLoadingUnits, handleMultiSelectChange }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    const toggleUnitSelection = (unitId: string) => {
        const currentIds = formData.unitIds || [];
        const newIds = currentIds.includes(unitId)
            ? currentIds.filter(id => id !== unitId)
            : [...currentIds, unitId];
        handleMultiSelectChange('unitIds', newIds);
    };

    if (isLoadingUnits) return <LoaderCircle className="animate-spin" />;

    return (
        <div className="space-y-6">
            <CardHeader className="p-0">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Step 5: Define Project Units</CardTitle>
                        <CardDescription>
                            Select all units of measurement that will be used in this project.
                        </CardDescription>
                    </div>
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> New Unit</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Create a New Global Unit</DialogTitle>
                                <DialogDescription>
                                    This unit will be available for all future projects.
                                </DialogDescription>
                            </DialogHeader>
                            <AddUnitForm onSuccess={() => setIsFormOpen(false)} />
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {units && units.length > 0 ? (
                    units.map(unit => (
                        <div key={unit.id} className="flex items-center space-x-3 rounded-md border p-3">
                            <Checkbox 
                                id={`unit-${unit.id}`}
                                checked={formData.unitIds?.includes(unit.id) || false}
                                onCheckedChange={() => toggleUnitSelection(unit.id)}
                            />
                            <Label htmlFor={`unit-${unit.id}`} className="font-medium text-sm w-full cursor-pointer">
                                {unit.name}
                            </Label>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No global units found. Add one to get started.</p>
                )}
            </div>
        </div>
    );
};


// Placeholder components for other steps
const Step6 = () => <div><CardTitle>Step 6: Define Zones</CardTitle></div>;
const Step7 = () => <div><CardTitle>Step 7: Define Activities</CardTitle></div>;
const Step8 = () => <div><CardTitle>Step 8: Define Sub-activities & Quantities</CardTitle></div>;
const Step9 = () => <div><CardTitle>Step 9: Review & Save</CardTitle></div>;


export default function NewProjectWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    cmIds: [],
    engineerIds: [],
    safetyOfficerIds: [],
    docControllerIds: [],
    logisticIds: [],
    unitIds: [],
  });
  const firestore = useFirestore();

  const companiesCollection = useMemoFirebase(() => collection(firestore, 'companies'), [firestore]);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesCollection);
  
  const usersCollection = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersCollection);

  const unitsCollection = useMemoFirebase(() => collection(firestore, 'units'), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsCollection);

  const userMap = useMemo(() => new Map(users?.map(u => [u.id, u.name])), [users]);

  const steps = [
    { name: 'Basics', component: (props) => <Step1_ProjectBasics {...props} /> },
    { name: 'Leadership', component: (props) => <Step2_Leadership {...props} /> },
    { name: 'Team', component: (props) => <Step3_Team {...props} /> },
    { name: 'Support', component: (props) => <Step4_Support {...props} /> },
    { name: 'Units', component: (props) => <Step5_DefineUnits {...props} /> },
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
      setFormData(prev => ({...prev, [name]: value}));
  }

  const handleMultiSelectChange = (name: string, value: string[]) => {
    setFormData(prev => ({...prev, [name]: value}));
  }

  const CurrentStepComponent = steps[currentStep].component;

  const componentProps = {
    formData,
    companies,
    isLoadingCompanies,
    users,
    isLoadingUsers,
    units,
    isLoadingUnits,
    userMap,
    handleChange,
    handleSelectChange,
    handleMultiSelectChange,
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
              
              <div className="flex items-center gap-2">
                {currentStep === 3 && ( // Only show Skip button on Step 4 (index 3)
                   <Button variant="ghost" onClick={handleNext}>
                    Skip
                   </Button>
                )}
                {currentStep < steps.length - 1 ? (
                  <Button onClick={handleNext}>
                    Next <ArrowRight className="ml-2" />
                  </Button>
                ) : (
                  <Button>Review & Save</Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

    