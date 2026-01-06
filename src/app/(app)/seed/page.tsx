
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { LoaderCircle, Database } from 'lucide-react';
import type { User } from '@/lib/types';

// Company ID mapping
const companyIdMap = {
    'NBHH': 'Zhc43Afe8Q2Kyq6gIGvy',
    'KMH': 'default-kmh-company-id' // Placeholder, replace with actual ID if available
};


const usersToSeed: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>[] & { companyName: string } = [
  { name: 'Abdullah Al-Jaber', email: 'abdullah.eng@nbhh.com', position: 'Engineer', companyName: 'NBHH', salaryNumber: '56705' },
  { name: 'Kosay Hatem', email: 'kosay-h@hotmail.com', position: 'Director', companyName: 'KMH', salaryNumber: '54429' }, // Assuming Director for empty
  { name: 'Aisha Al-Nuaimi', email: 'aisha.eng@nbhh.com', position: 'Engineer', companyName: 'NBHH', salaryNumber: '95016' },
  { name: 'Hassan Al-Mazrouei', email: 'hassan.eng@nbhh.com', position: 'Engineer', companyName: 'NBHH', salaryNumber: '12513' },
  { name: 'Cost Control', email: 'costcontrol@nbhh.ae', position: 'Director', companyName: 'NBHH', salaryNumber: '23545' },
  { name: 'CM', email: 'cm@nbhh.ae', position: 'CM', companyName: 'NBHH', salaryNumber: '72544' },
  { name: 'Mohammed Al-Qubaisi', email: 'mohammed.eng@nbhh.com', position: 'Engineer', companyName: 'NBHH', salaryNumber: '63024' },
  { name: 'Layla Al-Remeithi', email: 'layla.eng@nbhh.com', position: 'Engineer', companyName: 'NBHH', salaryNumber: '12353' },
  { name: 'Omar Al-Muhairi', email: 'omar.eng@nbhh.com', position: 'Engineer', companyName: 'NBHH', salaryNumber: '45446' },
  { name: 'Sultan Al-Kaabi', email: 'sultan.cm@nbhh.com', position: 'CM', companyName: 'NBHH', salaryNumber: '48262' },
  { name: 'CEO', email: 'ceo@nbhh.ae', position: 'CEO', companyName: 'NBHH', salaryNumber: '94392' },
  { name: 'PM', email: 'pm@nbhh.ae', position: 'PM', companyName: 'NBHH', salaryNumber: '18132' },
  { name: 'Mariam Al-Amiri', email: 'mariam.eng@nbhh.com', position: 'Document Controller', companyName: 'NBHH', salaryNumber: '87349' },
  { name: 'engineer', email: 'engineer@nbhh.ae', position: 'Engineer', companyName: 'NBHH', salaryNumber: '48542' },
  { name: 'Ali Al-Shamsi', email: 'ali.eng@nbhh.com', position: 'Engineer', companyName: 'NBHH', salaryNumber: '50602' },
  { name: 'Ahmed Al-Mansoori', email: 'ahmed.cm@nbhh.com', position: 'CM', companyName: 'NBHH', salaryNumber: '16778' },
  { name: 'Yusuf Al-Hashemi', email: 'yusuf.eng@nbhh.com', position: 'Logistic', companyName: 'NBHH', salaryNumber: '81620' },
  { name: 'Khalid Al-Farsi', email: 'khalid.pm@nbhh.com', position: 'PM', companyName: 'NBHH', salaryNumber: '30310' },
  { name: 'Sara Al-Zaabi', email: 'sara.eng@nbhh.com', position: 'Safety Officer', companyName: 'NBHH', salaryNumber: '26147' },
  { name: 'Director', email: 'director@nbhh.ae', position: 'Director', companyName: 'NBHH', salaryNumber: '45405' },
  { name: 'Fatima Al-Marzouqi', email: 'fatima.pm@nbhh.com', position: 'PM', companyName: 'NBHH', salaryNumber: '37643' },
  { name: 'Hessa Al-Falasi', email: 'hessa.eng@nbhh.com', position: 'Engineer', companyName: 'NBHH', salaryNumber: '42331' },
  { name: 'Zainab Al-Ketbi', email: 'zainab.eng@nbhh.com', position: 'Engineer', companyName: 'NBHH', salaryNumber: '45901' },
  { name: 'Noura Al-Shehhi', email: 'noura.cm@nbhh.com', position: 'Safety Manager', companyName: 'NBHH', salaryNumber: '27829' },
  { name: 'Eng. Mazher', email: 'pm@nbhh.ae', position: 'PM', companyName: 'NBHH', salaryNumber: '43155' },
  { name: 'Irfan', email: 'Irfan@inframanage.app', position: 'CM', companyName: 'NBHH', salaryNumber: '32479' },
  { name: 'Abdul Kareem', email: 'Abdulkareem@inframanage.app', position: 'CM', companyName: 'NBHH', salaryNumber: '29646' },
  { name: 'Admin User', email: 'admin@inframanage.app', position: 'Admin', companyName: 'NBHH', salaryNumber: '28560' },
  { name: 'Kosay', email: 'Kosay@inframanage.app', position: 'Logistic', companyName: 'NBHH', salaryNumber: '49647' },
  { name: 'Abdul Raheem', email: 'Abdulraheem@inframanage.app', position: 'General Foreman', companyName: 'NBHH', salaryNumber: '33121' },
  { name: 'Cost Control', email: 'costcontrol@ngc.ae', position: 'Director', companyName: 'NBHH', salaryNumber: '36748' },
  { name: 'Saif', email: 'engineer@nbhh.ae', position: 'Engineer', companyName: 'NBHH', salaryNumber: '30235' },
  { name: 'Safety 2', email: 'safety.downtown@inframanage.app', position: 'Safety Officer', companyName: 'NBHH', salaryNumber: '35390' },
  { name: 'NBHH CEO', email: 'ceo.nbhh@inframanage.app', position: 'CEO', companyName: 'NBHH', salaryNumber: '48488' },
  { name: 'Husain', email: 'cm@nbhh.ae', position: 'CM', companyName: 'NBHH', salaryNumber: '38651' },
  { name: 'Basem', email: 'Basem@inframanage.app', position: 'General Foreman', companyName: 'NBHH', salaryNumber: '31686' },
  { name: 'Director', email: 'costcontrol@nbhh.ae', position: 'Director', companyName: 'NBHH', salaryNumber: '32216' },
  { name: 'Admin User', email: 'kosay-h@hotmail.com', position: 'Admin', companyName: 'NBHH', salaryNumber: '33061' },
  { name: 'Safety', email: 'safety.stage@inframanage.app', position: 'Safety Officer', companyName: 'NBHH', salaryNumber: '46081' },
  { name: 'Bilal', email: 'Bilal@inframanage.app', position: 'General Foreman', companyName: 'NBHH', salaryNumber: '33583' },
  { name: 'Kosay', email: 'Kosay.hatem@gmail.com', position: 'Logistic', companyName: 'NBHH', salaryNumber: '31357' },
  { name: 'Eli Mansour', email: 'Eli@inframanage.app', position: 'Engineer', companyName: 'NBHH', salaryNumber: '46394' },
];


export default function SeedPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
        const usersCollectionRef = collection(firestore, 'users');
        const batch = writeBatch(firestore);

        usersToSeed.forEach(user => {
            const { companyName, ...userData } = user;
            const companyId = companyIdMap[companyName];
            
            if (!companyId) {
                console.warn(`Skipping user ${user.email} due to unknown company "${companyName}"`);
                return;
            }

            if(!userData.position) {
                console.warn(`Skipping user ${user.email} due to empty position.`);
                return;
            }

            const newDocRef = doc(usersCollectionRef); // Create a new doc with a random ID
            batch.set(newDocRef, {
                ...userData,
                companyId,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        });

        await batch.commit();

      toast({
        title: 'Database Seeded Successfully!',
        description: `${usersToSeed.length} users have been added.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Seed Database</h1>
        <p className="text-muted-foreground">
          Use this page to populate your Firestore database with initial data for development.
        </p>
      </header>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Seed Company Users</CardTitle>
          <CardDescription>
            Click the button below to add sample users to the database. This action is irreversible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSeed} disabled={isSeeding}>
            {isSeeding ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Database className="mr-2 h-4 w-4" />
            )}
            {isSeeding ? 'Seeding...' : `Seed ${usersToSeed.length} Users`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
