// Type definitions based on docs/backend.json

export interface UserProfile {
  name: string;
  role: string;
}

export interface Company {
  id: string;
  name: string;
  description: string;
  email: string;
  mobile: string;
  contactPerson: string;
  address: string;
  archived: boolean;
}

export interface ConstructionActivity {
  id: string;
  name: string;
  description: string;
  startDate: string; // ISO 8601 date string
  endDate: string; // ISO 8601 date string
  status: 'Not Started' | 'In Progress' | 'Completed';
}

export interface ProgressLog {
  id: string;
  activityId: string;
  logDate: any; // Can be a Date object or a Firestore Timestamp
  description: string;
  imageUrls?: string[];
  progressPercentage: number;
}

export interface ProgressLogWithActivity extends ProgressLog {
    activityName: string;
    status: string;
}

export interface Report {
  id: string;
  title: string;
  generationDate: string; // ISO 8601 date string
  activityIds: string[];
  content: string;
}

    