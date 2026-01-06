'use client';

import { useState } from 'react';
import { LoaderCircle, HardHat, PlusCircle, CalendarDays, User, Tag, Building, Wrench } from 'lucide-react';
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
import type { Equipment, EquipmentType } from '@/lib/types';
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
import { addEquipment } from '@/lib/firebase-actions';
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

function EquipmentForm({ equipmentTypes, onSuccess }: { equipmentTypes: EquipmentType[], onSuccess: () => void }) {
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
    const status = formData.get('status') as Equipment['status'];
    const assignedTo = formData.get('assignedTo') as string;
    const projectId = formData.get('projectId') as string;

    if (!plateNumber || !typeId || !status) {
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
        typeId,
        status,
        assignedTo,
        projectId,
        ownershipCertificateDate: ownershipDate ? ownershipDate.toISOString() : '',
        thirdPartyCertificateDate: thirdPartyDate ? thirdPartyDate.toISOString() : '',
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
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue="Working" required>
            <SelectTrigger id="status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Working">Working</SelectItem>
              <SelectItem value="Broken">Broken</SelectItem>
              <SelectItem value="In Garage">In Garage</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assignedTo">Assigned To (User ID)</Label>
          <Input id="assignedTo" name="assignedTo" placeholder="Enter User ID" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectId">Project ID</Label>
          <Input id="projectId" name="projectId" placeholder="Enter Project ID" />
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
  const [isFormOpen, setIsFormOpen] = useState(false);

  const equipmentCollectionRef = useMemoFirebase(() => {
    return collection(firestore, 'equipment');
  }, [firestore]);

  const { data: equipment, isLoading } = useCollection<Equipment>(equipmentCollectionRef);

  const equipmentTypesCollectionRef = useMemoFirebase(() => {
    return collection(firestore, 'equipment_names');
  }, [firestore]);

  const { data: equipmentTypes, isLoading: isLoadingTypes } = useCollection<EquipmentType>(equipmentTypesCollectionRef);

  const equipmentTypeMap = useMemoFirebase(() => {
    if (!equipmentTypes) return new Map();
    return new Map(equipmentTypes.map((t) => [t.id, t.name]));
  }, [equipmentTypes]);


  const getStatusVariant = (status: Equipment['status']) => {
    switch (status) {
      case 'Working':
        return 'default';
      case 'Broken':
        return 'destructive';
      case 'In Garage':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  
  const isLoadingData = isLoading || isLoadingTypes;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
          <p className="text-muted-foreground">
            Manage all company and rented equipment.
          </p>
        </div>
        <div className="flex items-center gap-4">
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
              {isLoadingTypes ? <LoaderCircle className="animate-spin" /> :
                <EquipmentForm equipmentTypes={equipmentTypes || []} onSuccess={() => setIsFormOpen(false)} />
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
                         <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                      </div>
                       <CardDescription className="flex items-center gap-2 pt-1">
                        <Wrench className="w-4 h-4" />
                        {equipmentTypeMap.get(item.typeId) || 'Unknown Type'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm mt-auto pt-4 border-t">
                      {item.assignedTo && (
                        <div className="flex items-center gap-3">
                            <User className="text-muted-foreground" />
                            <span className="text-muted-foreground">Assigned: {item.assignedTo}</span>
                        </div>
                      )}
                       {item.projectId && (
                        <div className="flex items-center gap-3">
                            <Building className="text-muted-foreground" />
                            <span className="text-muted-foreground">Project: {item.projectId}</span>
                        </div>
                      )}
                      {item.ownershipCertificateDate && (
                         <div className="flex items-center gap-3">
                            <CalendarDays className="text-muted-foreground" />
                            <span className="text-muted-foreground">Ownership Cert: {new Date(item.ownershipCertificateDate).toLocaleDateString()}</span>
                        </div>
                      )}
                       {item.thirdPartyCertificateDate && (
                         <div className="flex items-center gap-3">
                            <CalendarDays className="text-muted-foreground" />
                            <span className="text-muted-foreground">3rd Party Cert: {new Date(item.thirdPartyCertificateDate).toLocaleDateString()}</span>
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
