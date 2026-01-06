import type { ImagePlaceholder } from './placeholder-images';
import { PlaceHolderImages } from './placeholder-images';

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

export const constructionActivities = [
  { id: 'foundation', name: 'Foundation' },
  { id: 'framing', name: 'Framing' },
  { id: 'electrical', name: 'Electrical' },
  { id: 'plumbing', name: 'Plumbing' },
  { id: 'hvac', name: 'HVAC' },
  { id: 'drywall', name: 'Drywall' },
  { id: 'painting', name: 'Painting' },
  { id: 'flooring', name: 'Flooring' },
  { id: 'finishing', name: 'Finishing Touches' },
];

const reportImages = PlaceHolderImages.filter((img) =>
  img.id.startsWith('report-image-')
).reduce((acc, img) => {
  acc[img.id] = img;
  return acc;
}, {} as Record<string, ImagePlaceholder>);

export const reportLogs = [
  {
    id: 1,
    date: '2024-06-15',
    activity: 'Electrical',
    description: 'Completed rough-in wiring for the main floor. All boxes are set and ready for inspection.',
    status: 'Completed',
    image: reportImages['report-image-1'],
  },
  {
    id: 2,
    date: '2024-06-14',
    activity: 'Plumbing',
    description: 'Supply lines installed in the upstairs bathrooms. Waiting on fixtures to arrive for final installation.',
    status: 'In Progress',
    image: reportImages['report-image-2'],
  },
  {
    id: 3,
    date: '2024-06-12',
    activity: 'Foundation',
    description: 'Foundation walls have been poured and cured. Waterproofing is complete.',
    status: 'Completed',
    image: reportImages['report-image-3'],
  },
  {
    id: 4,
    date: '2024-06-10',
    activity: 'Framing',
    description: 'Exterior wall framing is 50% complete. Second-floor joists are being laid out.',
    status: 'In Progress',
    image: null,
  },
];
