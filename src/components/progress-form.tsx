

'use client';

import { useState, useRef, type ChangeEvent, type FormEvent } from 'react';
import Image from 'next/image';
import {
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  LoaderCircle,
  X,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { analyzeImageForSafety } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { DetectSafetyViolationsOutput } from '@/ai/flows/detect-safety-violations';
import { addProgressLog } from '@/lib/firebase-actions';
import { useAuth } from '@/firebase';

const placeholderImage = PlaceHolderImages.find(
  (img) => img.id === 'safety-analysis-placeholder'
);

export function ProgressForm() {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<DetectSafetyViolationsOutput | null>(null);
  
  const auth = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 6 * 1024 * 1024) { // 6MB limit
        toast({
          variant: 'destructive',
          title: 'Image Too Large',
          description: 'Please upload an image smaller than 6MB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImagePreview(dataUrl);
        setImageData(dataUrl);
        handleAnalyze(dataUrl);
      };
      reader.readAsDataURL(file);
      setAnalysisResult(null); // Clear previous results
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setAnalysisResult(null);
  };
  
  const handleAnalyze = async (data: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    const result = await analyzeImageForSafety(data);

    if ('error' in result) {
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: result.error,
      });
    } else {
      setAnalysisResult(result);
      toast({
        title: 'Analysis Complete',
        description: 'Safety check has finished successfully.',
      });
    }
    setIsAnalyzing(false);
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!auth) {
        toast({
            variant: 'destructive',
            title: 'Not Authenticated',
            description: 'You must be logged in to submit a log.',
        });
        return;
    }
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const description = formData.get('description') as string;

    if (!description) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please provide a description.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await addProgressLog(auth, {
        activityId: 'safety-observation',
        description,
        imageUrls: imageData ? [imageData] : [],
        progressPercentage: 0,
        status: 'Logged',
      });

      toast({
        title: 'Progress Logged',
        description: 'Your update has been saved successfully.',
      });
      formRef.current?.reset();
      handleRemoveImage();
    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'Could not save your progress log. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Create New Log</CardTitle>
          <CardDescription>
            Fill in the details of the progress and upload an image for our AI to
            analyze for safety violations.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
           <div className="space-y-2">
              <Label>Attach Image</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                id="image-upload"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Upload Image (max 6MB)
              </Button>
            </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe the progress made..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-4">
            <Label>Image Preview & Analysis</Label>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
              {isAnalyzing && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                    <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Image preview"
                  fill
                  className="object-cover"
                />
              ) : (
                placeholderImage && (
                  <Image
                    src={placeholderImage.imageUrl}
                    alt="Placeholder"
                    fill
                    className="object-cover"
                    data-ai-hint={placeholderImage.imageHint}
                  />
                )
              )}
              {imagePreview && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 rounded-full"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove image</span>
                </Button>
              )}
            </div>
            {analysisResult && (
              <Alert variant={analysisResult.isSafe ? 'default' : 'destructive'}>
                {analysisResult.isSafe ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {analysisResult.isSafe
                    ? 'No immediate safety violations detected.'
                    : 'Potential Safety Violations Detected!'}
                </AlertTitle>
                <AlertDescription>
                  {analysisResult.isSafe ? (
                    'Our AI analysis did not find any obvious safety issues. Always perform a manual check.'
                  ) : (
                    <ul className="list-disc pl-5 mt-2">
                      {analysisResult.violations.map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting || isAnalyzing} className="ml-auto">
            {(isSubmitting || isAnalyzing) && (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isSubmitting ? 'Logging...' : 'Log Progress'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

    