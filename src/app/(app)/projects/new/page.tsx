

'use client';

import { useState, useMemo, ChangeEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, ArrowRight, LoaderCircle, PlusCircle, Trash2, User as UserIcon, Check, Settings, Layout, ListChecks, Boxes, Upload, Download, Package, Users, HardHat } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Company, User, Unit, Zone, Activity, SubActivity } from '@/lib/types';
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
import { addUnit, createProjectFromWizard } from '@/lib/firebase-actions';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Papa from 'papaparse';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';


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
                <Select name="companyId" value={formData.companyId || ''} onValueChange={(value) => handleSelectChange('companyId', value)} required>
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
                        <Select name="directorId" value={formData.directorId || ''} onValueChange={(value) => handleSelectChange('directorId', value)} required>
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
                        <Select name="pmId" value={formData.pmId || ''} onValueChange={(value) => handleSelectChange('pmId', value)} required>
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


const Step6_DefineZones = ({ formData, handleMultiSelectChange }) => {
    const [zoneName, setZoneName] = useState('');
    const [zoneMap, setZoneMap] = useState('');

    const zones = formData.zones || [];

    const handleAddZone = () => {
        if (!zoneName.trim()) {
            // Consider showing a toast message here
            return;
        }
        const newZone: Omit<Zone, 'id'> = { 
            name: zoneName.trim(), 
            mapSvg: zoneMap.trim() || undefined 
        };
        handleMultiSelectChange('zones', [...zones, newZone]);
        setZoneName('');
        setZoneMap('');
    };

    const handleRemoveZone = (index: number) => {
        const newZones = [...zones];
        newZones.splice(index, 1);
        handleMultiSelectChange('zones', newZones);
    };

    return (
        <div className="space-y-6">
            <CardHeader className="p-0">
                <CardTitle>Step 6: Define Zones</CardTitle>
                <CardDescription>
                    Add project zones and optionally include an SVG map for each.
                </CardDescription>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="text-lg font-medium">Add New Zone</h3>
                     <div className="space-y-2">
                        <Label htmlFor="zoneName">Zone Name</Label>
                        <Input 
                            id="zoneName" 
                            value={zoneName} 
                            onChange={(e) => setZoneName(e.target.value)} 
                            placeholder="e.g., 'Sector A', 'Floor 1'"
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="zoneMap">Zone Map SVG (Optional)</Label>
                        <Textarea 
                            id="zoneMap"
                            value={zoneMap}
                            onChange={(e) => setZoneMap(e.target.value)}
                            placeholder="<svg>...</svg>"
                            rows={4}
                            className="font-mono text-xs"
                        />
                    </div>
                    <Button onClick={handleAddZone} className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Zone
                    </Button>
                </div>

                <div className="space-y-3">
                     <h3 className="text-lg font-medium">Added Zones</h3>
                     <div className="space-y-2 max-h-80 overflow-y-auto pr-2 rounded-lg border p-2">
                        {zones.length > 0 ? (
                            zones.map((zone, index) => (
                                <div key={index} className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-2">
                                    <div className="flex items-center gap-3">
                                        <Layout className="h-5 w-5 text-muted-foreground" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{zone.name}</span>
                                            {zone.mapSvg && <span className="text-xs text-muted-foreground">SVG map included</span>}
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveZone(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No zones added yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Step7_DefineActivities = ({ formData, handleMultiSelectChange }) => {
    const [activityName, setActivityName] = useState('');
    const [activityCode, setActivityCode] = useState('');
    const [activityDesc, setActivityDesc] = useState('');

    const activities = formData.activities || [];

    const handleAddActivity = () => {
        if (!activityName.trim() || !activityCode.trim()) {
            // Consider showing a toast message here for required fields
            return;
        }
        const newActivity: Omit<Activity, 'id'> = { 
            name: activityName.trim(), 
            code: activityCode.trim(),
            description: activityDesc.trim(),
        };
        handleMultiSelectChange('activities', [...activities, newActivity]);
        setActivityName('');
        setActivityCode('');
        setActivityDesc('');
    };

    const handleRemoveActivity = (index: number) => {
        const newActivities = [...activities];
        newActivities.splice(index, 1);
        handleMultiSelectChange('activities', newActivities);
    };

    return (
        <div className="space-y-6">
            <CardHeader className="p-0">
                <CardTitle>Step 7: Define Activities</CardTitle>
                <CardDescription>
                    Add the high-level construction activities for this project.
                </CardDescription>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="text-lg font-medium">Add New Activity</h3>
                     <div className="space-y-2">
                        <Label htmlFor="activityName">Activity Name</Label>
                        <Input 
                            id="activityName" 
                            value={activityName} 
                            onChange={(e) => setActivityName(e.target.value)} 
                            placeholder="e.g., 'Foundation Works'"
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="activityCode">Activity Code</Label>
                        <Input 
                            id="activityCode" 
                            value={activityCode} 
                            onChange={(e) => setActivityCode(e.target.value)} 
                            placeholder="e.g., 'FW-01'"
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="activityDesc">Description (Optional)</Label>
                        <Textarea 
                            id="activityDesc"
                            value={activityDesc}
                            onChange={(e) => setActivityDesc(e.target.value)}
                            placeholder="Describe the activity..."
                            rows={3}
                        />
                    </div>
                    <Button onClick={handleAddActivity} className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Activity
                    </Button>
                </div>

                <div className="space-y-3">
                     <h3 className="text-lg font-medium">Added Activities</h3>
                     <div className="space-y-2 max-h-80 overflow-y-auto pr-2 rounded-lg border p-2">
                        {activities.length > 0 ? (
                            activities.map((activity, index) => (
                                <div key={index} className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3">
                                    <div className="flex items-start gap-3">
                                        <ListChecks className="h-5 w-5 text-muted-foreground mt-1" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{activity.name} ({activity.code})</span>
                                            {activity.description && <p className="text-xs text-muted-foreground">{activity.description}</p>}
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => handleRemoveActivity(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No activities added yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


const Step8_SubActivities = ({ formData, units, handleMultiSelectChange, handleImport, handleExport }) => {
    const { toast } = useToast();
    const [currentSubActivity, setCurrentSubActivity] = useState({ name: '', description: '', unit: '', totalWork: 0 });
    const [zoneQuantities, setZoneQuantities] = useState({});
    const importInputRef = useRef<HTMLInputElement>(null);

    const activities = formData.activities || [];
    const zones = formData.zones || [];
    const projectUnits = useMemo(() => {
        const selectedUnitIds = new Set(formData.unitIds || []);
        return units.filter(u => selectedUnitIds.has(u.id));
    }, [units, formData.unitIds]);

    const handleSubActivityChange = (e) => {
        const { name, value } = e.target;
        setCurrentSubActivity(prev => ({ ...prev, [name]: value }));
    };

    const handleUnitChange = (value) => {
        setCurrentSubActivity(prev => ({ ...prev, unit: value }));
    };

    const handleZoneQuantityChange = (zoneName, value) => {
        setZoneQuantities(prev => ({ ...prev, [zoneName]: Number(value) || 0 }));
    };

    const handleAddSubActivity = (activityIndex) => {
        if (!currentSubActivity.name || !currentSubActivity.unit || !currentSubActivity.totalWork) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Sub-activity name, unit, and total work are required.' });
            return;
        }

        const newSubActivity = {
            ...currentSubActivity,
            activityId: activityIndex, // Using index as temporary ID
            zoneQuantities
        };
        
        const newSubActivities = [...(formData.subActivities || []), newSubActivity];
        handleMultiSelectChange('subActivities', newSubActivities);

        // Reset forms
        setCurrentSubActivity({ name: '', description: '', unit: '', totalWork: 0 });
        setZoneQuantities({});
    };

    const getSubActivitiesForActivity = (activityIndex) => {
        return (formData.subActivities || []).filter(sa => sa.activityId === activityIndex);
    }
    
    if (activities.length === 0) {
        return (
            <div className="space-y-6">
                <CardHeader className="p-0">
                    <CardTitle>Step 8: Define Sub-activities & BoQ</CardTitle>
                    <CardDescription>
                        First, go back to Step 7 and add at least one activity.
                    </CardDescription>
                </CardHeader>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <CardHeader className="p-0">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Step 8: Define Sub-activities & BoQ</CardTitle>
                        <CardDescription>
                            For each activity, define its sub-activities and assign quantities for each zone.
                        </CardDescription>
                    </div>
                     <div className="flex gap-2">
                        <input
                            type="file"
                            ref={importInputRef}
                            className="hidden"
                            accept=".csv"
                            onChange={handleImport}
                        />
                        <Button variant="outline" size="sm" onClick={() => importInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" /> Import CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <Accordion type="single" collapsible className="w-full">
                {activities.map((activity, index) => (
                    <AccordionItem value={`item-${index}`} key={index}>
                        <AccordionTrigger>{activity.name} ({activity.code})</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-6 p-4 border rounded-md">
                                <h4 className="font-semibold text-md">Add New Sub-activity</h4>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    <Input name="name" placeholder="Sub-activity Name" value={currentSubActivity.name} onChange={handleSubActivityChange} />
                                    <Select name="unit" onValueChange={handleUnitChange} value={currentSubActivity.unit}>
                                        <SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger>
                                        <SelectContent>
                                            {projectUnits.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Input name="totalWork" type="number" placeholder="Total Work (Qty)" value={currentSubActivity.totalWork || ''} onChange={handleSubActivityChange} />
                                </div>
                                <Textarea name="description" placeholder="Sub-activity description (optional)" value={currentSubActivity.description} onChange={handleSubActivityChange} rows={2}/>

                                <div className="space-y-2">
                                    <Label>Zone Quantities</Label>
                                    {zones.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-2 border rounded-md">
                                            {zones.map((zone, zIndex) => (
                                                <div key={zIndex} className="space-y-1">
                                                    <Label htmlFor={`zone-${index}-${zIndex}`} className="text-xs text-muted-foreground">{zone.name}</Label>
                                                    <Input 
                                                        id={`zone-${index}-${zIndex}`} 
                                                        type="number" 
                                                        placeholder="Qty" 
                                                        value={zoneQuantities[zone.name] || ''}
                                                        onChange={(e) => handleZoneQuantityChange(zone.name, e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-xs text-muted-foreground">No zones defined. Go back to Step 6 to add zones.</p>}
                                </div>
                                <Button onClick={() => handleAddSubActivity(index)}><PlusCircle className="mr-2 h-4 w-4"/> Add Sub-activity</Button>
                                
                                <hr />

                                <h4 className="font-semibold text-md">Defined Sub-activities</h4>
                                <div className="space-y-4">
                                    {getSubActivitiesForActivity(index).map((sa, saIndex) => (
                                        <div key={saIndex} className="p-3 border rounded-lg bg-muted/20">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium flex items-center gap-2"><Boxes className="w-4 h-4 text-primary"/>{sa.name}</p>
                                                    <p className="text-sm text-muted-foreground">{sa.description}</p>
                                                </div>
                                                <p className="text-sm font-mono bg-muted px-2 py-1 rounded">{sa.totalWork} {sa.unit}</p>
                                            </div>
                                            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                                {Object.entries(sa.zoneQuantities).map(([zone, qty]) => (
                                                    <div key={zone} className="flex justify-between items-center bg-muted/50 p-1.5 rounded">
                                                        <span className="text-muted-foreground">{zone}:</span>
                                                        <span className="font-medium">{String(qty)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {getSubActivitiesForActivity(index).length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No sub-activities added yet.</p>}
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
};


const Step9_Review = ({ formData, companyMap, userMap }) => {
    const { 
        name, companyId, directorId, pmId,
        cmIds = [], engineerIds = [], safetyOfficerIds = [], docControllerIds = [], logisticIds = [],
        zones = [], activities = [], subActivities = []
    } = formData;

    const getTeamCount = (...teams) => teams.flat().filter(Boolean).length;
    
    return (
        <div className="space-y-6">
            <CardHeader className="p-0">
                <CardTitle>Step 9: Review & Create Project</CardTitle>
                <CardDescription>
                    Review all the information below before creating the project.
                </CardDescription>
            </CardHeader>
            <Accordion type="multiple" defaultValue={['item-1', 'item-2', 'item-3']} className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <div className="flex items-center gap-2">
                           <Package className="w-5 h-5 text-primary" />
                           <h3 className="font-semibold">Project Details</h3>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                        <div className="grid grid-cols-2 gap-4 text-sm p-4 border rounded-md">
                            <div><Label>Project Name:</Label><p>{name}</p></div>
                            <div><Label>Company:</Label><p>{companyMap.get(companyId)}</p></div>
                            <div><Label>Director:</Label><p>{userMap.get(directorId)}</p></div>
                            <div><Label>Project Manager:</Label><p>{userMap.get(pmId)}</p></div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger>
                       <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold">Team Members</h3>
                            <Badge variant="secondary">{getTeamCount(directorId, pmId, cmIds, engineerIds, safetyOfficerIds, docControllerIds, logisticIds)}</Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm p-4 border rounded-md">
                            {[
                                { title: 'CMs', ids: cmIds },
                                { title: 'Engineers', ids: engineerIds },
                                { title: 'Safety', ids: safetyOfficerIds },
                                { title: 'Doc Controllers', ids: docControllerIds },
                                { title: 'Logistics', ids: logisticIds },
                            ].map(role => (
                                <div key={role.title}>
                                    <Label>{role.title}:</Label>
                                    <ul className="list-disc list-inside">
                                        {role.ids.map(id => <li key={id}>{userMap.get(id)}</li>)}
                                        {role.ids.length === 0 && <li className="text-muted-foreground text-xs">None</li>}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="item-3">
                    <AccordionTrigger>
                       <div className="flex items-center gap-2">
                           <HardHat className="w-5 h-5 text-primary" />
                           <h3 className="font-semibold">Work Breakdown</h3>
                           <Badge variant="secondary">{activities.length} Activities / {subActivities.length} Sub-activities</Badge>
                        </div>
                    </AccordionTrigger>
                     <AccordionContent className="pt-2">
                        <div className="space-y-4 p-4 border rounded-md">
                           <div>
                                <Label>Zones:</Label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {zones.map(z => <Badge key={z.name} variant="outline">{z.name}</Badge>)}
                                    {zones.length === 0 && <p className="text-xs text-muted-foreground">No zones defined.</p>}
                                </div>
                            </div>
                           <div>
                                <Label>Activities & BoQ:</Label>
                                {activities.map((act, index) => (
                                    <div key={index} className="mt-1 p-2 border-l-2">
                                        <p className="font-medium">{act.name} ({act.code})</p>
                                        <ul className="list-disc list-inside pl-4 text-sm">
                                            {subActivities.filter(sa => sa.activityId === index).map((sa, saIndex) => (
                                                <li key={saIndex}>{sa.name} - <span className="text-muted-foreground">{sa.totalWork} {sa.unit}</span></li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                                {activities.length === 0 && <p className="text-xs text-muted-foreground">No activities defined.</p>}
                           </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
};



export default function NewProjectWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    companyId: '',
    directorId: '',
    pmId: '',
    status: 'active',
    address: '',
    googleMapsUrl: '',
    kmlUrl: '',
    cmIds: [],
    engineerIds: [],
    safetyOfficerIds: [],
    docControllerIds: [],
    logisticIds: [],
    unitIds: [],
    zones: [],
    activities: [],
    subActivities: [],
  });
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const companiesCollection = useMemoFirebase(() => collection(firestore, 'companies'), [firestore]);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesCollection);
  
  const usersCollection = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersCollection);

  const unitsCollection = useMemoFirebase(() => collection(firestore, 'units'), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsCollection);

  const userMap = useMemo(() => new Map(users?.map(u => [u.id, u.name])), [users]);
  const companyMap = useMemo(() => new Map(companies?.map(c => [c.id, c.name])), [companies]);

  const steps = [
    { name: 'Basics', component: (props) => <Step1_ProjectBasics {...props} />, isStepValid: () => !!formData.name && !!formData.companyId },
    { name: 'Leadership', component: (props) => <Step2_Leadership {...props} />, isStepValid: () => !!formData.directorId && !!formData.pmId },
    { name: 'Team', component: (props) => <Step3_Team {...props} />, isStepValid: () => true }, // Optional
    { name: 'Support', component: (props) => <Step4_Support {...props} />, isStepValid: () => true }, // Optional
    { name: 'Units', component: (props) => <Step5_DefineUnits {...props} />, isStepValid: () => true }, // Optional
    { name: 'Zones', component: (props) => <Step6_DefineZones {...props} />, isStepValid: () => true }, // Optional
    { name: 'Activities', component: (props) => <Step7_DefineActivities {...props} />, isStepValid: () => true }, // Optional
    { name: 'Sub-activities', component: (props) => <Step8_SubActivities {...props} />, isStepValid: () => true }, // Optional
    { name: 'Review', component: (props) => <Step9_Review {...props} />, isStepValid: () => true },
  ];

  const handleNext = () => {
    if (steps[currentStep].isStepValid()) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    } else {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill in all required fields before proceeding.'});
    }
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

  const handleMultiSelectChange = (name: string, value: any[]) => {
    setFormData(prev => ({...prev, [name]: value}));
  }

  const handleExport = () => {
        const { activities, zones, subActivities } = formData;
        if (!subActivities || subActivities.length === 0) {
            toast({ variant: "destructive", title: "No data to export" });
            return;
        }

        const activityMap = new Map(activities.map((act, index) => [index, act]));
        const zoneNames = zones.map(zone => zone.name);

        const dataToExport = subActivities.map(sa => {
            const activity = activityMap.get(sa.activityId);
            const row: Record<string, any> = {
                'ActivityCode': activity?.code || '',
                'ActivityName': activity?.name || '',
                'SubActivityName': sa.name,
                'Description': sa.description,
                'Unit': sa.unit,
                'TotalWork': sa.totalWork,
            };
            zoneNames.forEach(zoneName => {
                row[zoneName] = sa.zoneQuantities[zoneName] || 0;
            });
            return row;
        });

        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'boq_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Export successful" });
  };

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const parsedData = results.data as Record<string, string>[];
            const { activities, zones } = formData;
            const activityCodeMap = new Map(activities.map((act, index) => [act.code, index]));
            const zoneNames = new Set(zones.map(z => z.name));

            const newSubActivities: any[] = [];
            let errorOccurred = false;

            for (const row of parsedData) {
                const { ActivityCode, SubActivityName, Description, Unit, TotalWork, ...zoneQtys } = row;

                if (!activityCodeMap.has(ActivityCode)) {
                    toast({ variant: "destructive", title: "Import Error", description: `Activity code "${ActivityCode}" not found in project.` });
                    errorOccurred = true;
                    break;
                }

                const zoneQuantities = {};
                for (const zoneName in zoneQtys) {
                    if (zoneNames.has(zoneName)) {
                        zoneQuantities[zoneName] = Number(zoneQtys[zoneName]) || 0;
                    }
                }
                
                newSubActivities.push({
                    name: SubActivityName,
                    description: Description || '',
                    unit: Unit,
                    totalWork: Number(TotalWork) || 0,
                    activityId: activityCodeMap.get(ActivityCode),
                    zoneQuantities,
                });
            }

            if (!errorOccurred) {
                handleMultiSelectChange('subActivities', [...formData.subActivities, ...newSubActivities]);
                toast({ title: "Import Successful", description: `${newSubActivities.length} sub-activities were imported.` });
            }
        },
        error: (error) => {
            toast({ variant: "destructive", title: "CSV Parsing Error", description: error.message });
        }
    });
     // Reset file input
    if (event.target) {
        event.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!auth) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to create a project.' });
      return;
    }
    if (!steps[0].isStepValid() || !steps[1].isStepValid()) {
      toast({ variant: 'destructive', title: 'Incomplete Information', description: 'Please complete all required fields in Step 1 & 2.' });
      return;
    }
    
    setIsSubmitting(true);
    try {
        await createProjectFromWizard(firestore, formData, { users, companies });
        toast({ title: 'Project Created!', description: `${formData.name} has been successfully created.`});
        router.push('/projects');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to Create Project', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };


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
    companyMap,
    handleChange,
    handleSelectChange,
    handleMultiSelectChange,
    handleExport,
    handleImport,
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
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting && <LoaderCircle className="animate-spin mr-2" />}
                    Create Project
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
