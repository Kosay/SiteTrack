'use server';

import {
  detectSafetyViolations,
  type DetectSafetyViolationsOutput,
} from '@/ai/flows/detect-safety-violations';

export async function analyzeImageForSafety(
  imageDataUri: string
): Promise<DetectSafetyViolationsOutput | { error: string }> {
  if (!imageDataUri || !imageDataUri.startsWith('data:image/')) {
    return { error: 'Invalid image data provided.' };
  }
  try {
    const result = await detectSafetyViolations({ imageDataUri });
    return result;
  } catch (error) {
    console.error('AI analysis failed:', error);
    return { error: 'Failed to analyze image. Please try again.' };
  }
}
