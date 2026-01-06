import type { ImagePlaceholder } from './placeholder-images';
import { PlaceHolderImages } from './placeholder-images';
import type { ConstructionActivity, ProgressLog } from './types';

// Mock data is kept for reference but will be replaced by Firestore data in the app.

export const overallProgressData = [
  { date: 'Jan', progress: 10 },
  { date: 'Feb', progress: 25 },
  { date: 'Mar', progress: 45 },
  { date: 'Apr', progress: 60 },
  { date: 'May', progress: 70 },
  { date: 'Jun', progress: 85 },
];

export const activityProgressData = [
  { name: 'Foundation', progress: 100 },
  { name: 'Framing', progress: 90 },
  { name: 'Electrical', progress: 75 },
  { name: 'Plumbing', progress: 60 },
  { name: 'Finishing', progress: 30 },
];

export const constructionActivities: ConstructionActivity[] = [
  { id: 'foundation', name: 'Foundation', description: '', startDate: '', endDate: '', status: 'Completed' },
  { id: 'framing', name: 'Framing', description: '', startDate: '', endDate: '', status: 'In Progress' },
  { id: 'electrical', name: 'Electrical', description: '', startDate: '', endDate: '', status: 'In Progress' },
  { id: 'plumbing', name: 'Plumbing', description: '', startDate: '', endDate: '', status: 'In Progress' },
  { id: 'hvac', name: 'HVAC', description: '', startDate: '', endDate: '', status: 'Not Started' },
  { id: 'drywall', name: 'Drywall', description: '', startDate: '', endDate: '', status: 'Not Started' },
  { id: 'painting', name: 'Painting', description: '', startDate: '', endDate: '', status: 'Not Started' },
  { id: 'flooring', name: 'Flooring', description: '', startDate: '', endDate: '', status: 'Not Started' },
  { id: 'finishing', name: 'Finishing Touches', description: '', startDate: '', endDate: '', status: 'Not Started' },
];

const reportImages = PlaceHolderImages.filter((img) =>
  img.id.startsWith('report-image-')
).reduce((acc, img) => {
  acc[img.id] = img;
  return acc;
}, {} as Record<string, ImagePlaceholder>);

export const reportLogs: (ProgressLog & { activity: string, image?: ImagePlaceholder, status: string })[] = [
  {
    id: '1',
    logDate: '2024-06-15',
    activity: 'Electrical',
    description: 'Completed rough-in wiring for the main floor. All boxes are set and ready for inspection.',
    status: 'Completed',
    image: reportImages['report-image-1'],
    activityId: 'electrical',
    progressPercentage: 100,
    imageUrls: reportImages['report-image-1'] ? [reportImages['report-image-1'].imageUrl] : [],
  },
  {
    id: '2',
    logDate: '2024-06-14',
    activity: 'Plumbing',
    description: 'Supply lines installed in the upstairs bathrooms. Waiting on fixtures to arrive for final installation.',
    status: 'In Progress',
    image: reportImages['report-image-2'],
    activityId: 'plumbing',
    progressPercentage: 60,
    imageUrls: reportImages['report-image-2'] ? [reportImages['report-image-2'].imageUrl] : [],
  },
  {
    id: '3',
    logDate: '2024-06-12',
    activity: 'Foundation',
    description: 'Foundation walls have been poured and cured. Waterproofing is complete.',
    status: 'Completed',
    image: reportImages['report-image-3'],
    activityId: 'foundation',
    progressPercentage: 100,
    imageUrls: reportImages['report-image-3'] ? [reportImages['report-image-3'].imageUrl] : [],
  },
  {
    id: '4',
    logDate: '2024-06-10',
    activity: 'Framing',
    description: 'Exterior wall framing is 50% complete. Second-floor joists are being laid out.',
    status: 'In Progress',
    image: undefined,
    activityId: 'framing',
    progressPercentage: 50,
    imageUrls: [],
  },
];
