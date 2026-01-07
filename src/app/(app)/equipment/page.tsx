
'use client';

import { useState, useMemo, ChangeEvent, useRef } from 'react';
import { LoaderCircle, HardHat, PlusCircle, CalendarDays, User, Building, Wrench, Upload, Download } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Equipment, EquipmentType, Project, User as SiteUser } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { addEquipment, batchAddEquipment } from '@/lib/firebase-actions';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import Papa from 'papaparse';


function EquipmentForm({ equipmentTypes, projects, users, onSuccess }: { equipmentTypes: EquipmentType[], projects: Project[], users: SiteUser[], onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [ownershipDate, setOwnershipDate] = useState<Date | undefined>();
  const [thirdPartyDate, setThirdPartyDate] = useState<Date | undefined>();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const plateNumber = formData.get('plateNumber') as string;
    const typeId = formData.get('typeId') as string;
    const situation = formData.get('situation') as Equipment['situation'];
    const assigneeId = formData.get('assigneeId') as string;
    const projectId = formData.get('projectId') as string;

    if (!plateNumber || !typeId || !situation) {
      toast({
        variant: 'destructive',
        title: 'Required fields are missing.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await addEquipment({
        plateNumber,
        equipmentNameId: typeId,
        situation,
        assigneeId,
        projectId,
        ownershipCertificateDate: ownershipDate ? ownershipDate.toISOString() : undefined,
        thirdPartyCertificateDate: thirdPartyDate ? thirdPartyDate.toISOString() : undefined,
      });
      toast({
        title: 'Equipment Added',
        description: `${plateNumber} has been added to the inventory.`,
      });
      onSuccess();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to add equipment',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="plateNumber">Plate Number</Label>
          <Input id="plateNumber" name="plateNumber" placeholder="e.g., 'EQ-12345'" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="typeId">Equipment Type</Label>
          <Select name="typeId" required>
            <SelectTrigger id="typeId">
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {equipmentTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="situation">Situation</Label>
          <Select name="situation" defaultValue="Working at site" required>
            <SelectTrigger id="situation">
              <SelectValue placeholder="Select situation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Working at site">Working at site</SelectItem>
              <SelectItem value="Broke down at site">Broke down at site</SelectItem>
              <SelectItem value="In garage">In garage</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assigneeId">Assigned To</Label>
          <Select name="assigneeId">
            <SelectTrigger id="assigneeId">
                <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectId">Project</Label>
          <Select name="projectId">
            <SelectTrigger id="projectId">
                <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Ownership Certificate Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !ownershipDate && 'text-muted-foreground'
                )}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                {ownershipDate ? format(ownershipDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={ownershipDate} onSelect={setOwnershipDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>3rd Party Certificate Date</Label>
           <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !thirdPartyDate && 'text-muted-foreground'
                )}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                {thirdPartyDate ? format(thirdPartyDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={thirdPartyDate} onSelect={setThirdPartyDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
          Add Equipment
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function EquipmentPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const equipmentCollectionRef = useMemoFirebase(() => collection(firestore, 'equipment'), [firestore]);
  const { data: equipment, isLoading } = useCollection<Equipment>(equipmentCollectionRef);

  const equipmentTypesCollectionRef = useMemoFirebase(() => collection(firestore, 'equipment_names'), [firestore]);
  const { data: equipmentTypes, isLoading: isLoadingTypes } = useCollection<EquipmentType>(equipmentTypesCollectionRef);

  const projectsCollectionRef = useMemoFirebase(() => collection(firestore, 'projects'), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsCollectionRef);

  const usersCollectionRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<SiteUser>(usersCollectionRef);

  const equipmentTypeMap = useMemo(() => new Map(equipmentTypes?.map((t) => [t.id, t.name])), [equipmentTypes]);
  const projectMap = useMemo(() => new Map(projects?.map((p) => [p.id, p.name])), [projects]);
  const userMap = useMemo(() => new Map(users?.map((u) => [u.id, u.name])), [users]);
  
  const equipmentTypeNameMap = useMemo(() => new Map(equipmentTypes?.map((t) => [t.name, t.id])), [equipmentTypes]);
  const projectNameMap = useMemo(() => new Map(projects?.map((p) => [p.name, p.id])), [projects]);
  const userNameMap = useMemo(() => new Map(users?.map((u) => [u.name, u.id])), [users]);

  const getStatusVariant = (status: Equipment['situation']) => {
    switch (status) {
      case 'Working at site':
        return 'default';
      case 'Broke down at site':
        return 'destructive';
      case 'In garage':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  
  const handleExport = () => {
    if (!equipment || equipment.length === 0) {
      toast({ variant: 'destructive', title: 'No equipment to export' });
      return;
    }

    const dataToExport = equipment.map(item => ({
      'EquipmentName': equipmentTypeMap.get(item.equipmentNameId) || 'N/A',
      'PlateNumber': item.plateNumber,
      'Project': projectMap.get(item.projectId) || 'N/A',
      'Assignee': userMap.get(item.assigneeId) || 'N/A',
      'Situation': item.situation,
      'Remarks': item.remarks || '',
      'OwnershipCertificateDate': item.ownershipCertificateDate ? format(new Date(item.ownershipCertificateDate), 'yyyy-MM-dd') : '',
      'ThirdPartyCertificateDate': item.thirdPartyCertificateDate ? format(new Date(item.thirdPartyCertificateDate), 'yyyy-MM-dd') : '',
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'equipment_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export successful", description: `${equipment.length} items exported.` });
  };

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedData = results.data;
        const equipmentToBatchAdd: Omit<Equipment, 'id'>[] = [];
        let errorCount = 0;

        for (const row of parsedData) {
          const { EquipmentName, PlateNumber, Project, Assignee, Situation, Remarks, OwnershipCertificateDate, ThirdPartyCertificateDate } = row;
          
          const equipmentNameId = equipmentTypeNameMap.get(EquipmentName);
          const projectId = projectNameMap.get(Project);
          const assigneeId = userNameMap.get(Assignee);

          if (!PlateNumber || !equipmentNameId || !Situation) {
            console.warn('Skipping row due to missing required fields:', row);
            errorCount++;
            continue;
          }

          equipmentToBatchAdd.push({
            plateNumber: PlateNumber,
            equipmentNameId: equipmentNameId,
            projectId: projectId || '',
            assigneeId: assigneeId || '',
            situation: Situation,
            remarks: Remarks || '',
            ownershipCertificateDate: OwnershipCertificateDate || undefined,
            thirdPartyCertificateDate: ThirdPartyCertificateDate || undefined,
            ownershipType: 'Company', // Defaulting, adjust if needed
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
        
        if (equipmentToBatchAdd.length > 0) {
            try {
                await batchAddEquipment(equipmentToBatchAdd);
                toast({
                  title: "Import Complete",
                  description: `${equipmentToBatchAdd.length} items imported successfully.` + (errorCount > 0 ? ` ${errorCount} rows failed.` : '')
                });
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Import Failed', description: e.message });
            }
        } else {
             toast({ variant: 'destructive', title: 'Import Failed', description: `No valid rows to import. ${errorCount} rows had errors.` });
        }
      },
      error: (error) => {
        toast({ variant: 'destructive', title: 'CSV Parsing Error', description: error.message });
      }
    });

    if (event.target) {
        event.target.value = '';
    }
  };


  const isLoadingData = isLoading || isLoadingTypes || isLoadingProjects || isLoadingUsers;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
          <p className="text-muted-foreground">
            Manage all company and rented equipment.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <input
                type="file"
                ref={importInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleImport}
            />
            <Button variant="outline" onClick={() => importInputRef.current?.click()}><Upload className="mr-2"/> Import</Button>
            <Button variant="outline" onClick={handleExport}><Download className="mr-2"/> Export</Button>
           <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
             <Button onClick={() => setIsFormOpen(true)}>
              <PlusCircle className="mr-2" />
              New Equipment
            </Button>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Equipment</DialogTitle>
                <DialogDescription>
                  Fill out the form to add a new piece of equipment to the inventory.
                </DialogDescription>
              </DialogHeader>
              {isLoadingData ? <LoaderCircle className="animate-spin" /> :
                <EquipmentForm 
                    equipmentTypes={equipmentTypes || []} 
                    projects={projects || []}
                    users={users || []}
                    onSuccess={() => setIsFormOpen(false)} />
              }
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {isLoadingData ? (
        <div className="flex items-center justify-center h-64">
          <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Equipment Inventory</CardTitle>
            <CardDescription>
              {equipment?.length || 0} pieces of equipment are being tracked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {equipment && equipment.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {equipment.map((item) => (
                  <Card key={item.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="line-clamp-1">{item.plateNumber}</CardTitle>
                         <Badge variant={getStatusVariant(item.situation)}>{item.situation}</Badge>
                      </div>
                       <CardDescription className="flex items-center gap-2 pt-1">
                        <Wrench className="w-4 h-4" />
                        {equipmentTypeMap.get(item.equipmentNameId) || 'Unknown Type'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm mt-auto pt-4 border-t">
                      {item.assigneeId && (
                        <div className="flex items-center gap-3">
                            <User className="text-muted-foreground" />
                            <span className="text-muted-foreground">Assigned: {userMap.get(item.assigneeId)}</span>
                        </div>
                      )}
                       {item.projectId && (
                        <div className="flex items-center gap-3">
                            <Building className="text-muted-foreground" />
                            <span className="text-muted-foreground">Project: {projectMap.get(item.projectId)}</span>
                        </div>
                      )}
                      {item.ownershipCertificateDate && (
                         <div className="flex items-center gap-3">
                            <CalendarDays className="text-muted-foreground" />
                            <span className="text-muted-foreground">Ownership Cert: {format(new Date(item.ownershipCertificateDate), 'PPP')}</span>
                        </div>
                      )}
                       {item.thirdPartyCertificateDate && (
                         <div className="flex items-center gap-3">
                            <CalendarDays className="text-muted-foreground" />
                            <span className="text-muted-foreground">3rd Party Cert: {format(new Date(item.thirdPartyCertificateDate), 'PPP')}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <HardHat className="w-12 h-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">
                  No Equipment Found
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Get started by adding a new piece of equipment.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
