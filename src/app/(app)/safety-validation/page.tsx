'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, Upload, Sparkles, AlertTriangle, CheckCircle, ShieldQuestion } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { analyzeImageForSafety } from '@/app/actions';
import { Badge } from '@/components/ui/badge';

const placeholder = PlaceHolderImages.find(p => p.id === 'safety-analysis-placeholder');

export default function SafetyValidationPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(placeholder?.imageUrl || null);
  const [analysisResult, setAnalysisResult] = useState<{violation_found: boolean; rule_id: string; description: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    // Ensure placeholder is set on initial client render
    if (!imagePreview && placeholder?.imageUrl) {
        setImagePreview(placeholder.imageUrl);
    }
  }, [imagePreview]);


  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({
            variant: 'destructive',
            title: 'Invalid File Type',
            description: 'Please select an image file (e.g., JPG, PNG, WEBP).',
        });
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUri = e.target?.result as string;
      setImagePreview(dataUri);
      setAnalysisResult(null); // Reset previous analysis
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeClick = async () => {
    if (!imagePreview || imagePreview === placeholder?.imageUrl) {
      toast({
        variant: 'destructive',
        title: 'No Image Selected',
        description: 'Please upload an image to analyze.',
      });
      return;
    }
    
    setIsLoading(true);
    setAnalysisResult(null);

    try {
      const result = await analyzeImageForSafety(imagePreview);
      if ('error' in result) {
        throw new Error(result.error);
      }
      setAnalysisResult(result);
      toast({
        title: 'Analysis Complete',
        description: result.violation_found ? 'A potential safety violation was detected.' : 'The image appears to be safe.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const getResultVariant = () => {
    if (!analysisResult) return 'secondary';
    return analysisResult.violation_found ? 'destructive' : 'default';
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Safety Validation</h1>
        <p className="text-muted-foreground">
          Use AI to automatically detect potential safety violations on site.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Image Upload</CardTitle>
            <CardDescription>
              Upload a photo from the construction site to be analyzed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video w-full overflow-hidden rounded-md border-2 border-dashed flex items-center justify-center">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Site preview"
                  fill
                  className="object-contain"
                  data-ai-hint={placeholder?.imageHint || 'construction site'}
                />
              ) : (
                 <div className="text-center text-muted-foreground">
                    <ShieldQuestion className="mx-auto h-12 w-12" />
                    <p>No image selected</p>
                 </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
            />
          </CardContent>
          <CardFooter className="justify-between">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </Button>
            <Button onClick={handleAnalyzeClick} disabled={isLoading}>
              {isLoading ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Analyze
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Analysis Result</CardTitle>
            <CardDescription>The outcome of the safety check will appear below.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <LoaderCircle className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="font-medium">Analyzing image...</p>
                    <p className="text-sm">This may take a moment.</p>
                </div>
            ) : analysisResult ? (
                 <div className="space-y-4">
                     <div className="flex items-start gap-4">
                        {analysisResult.violation_found ? (
                            <AlertTriangle className="h-8 w-8 text-destructive flex-shrink-0 mt-1" />
                        ) : (
                            <CheckCircle className="h-8 w-8 text-green-500 flex-shrink-0 mt-1" />
                        )}
                        <div>
                             <p className="font-bold text-lg">
                                {analysisResult.violation_found ? 'Violation Detected' : 'No Violation Found'}
                            </p>
                            <p className="text-muted-foreground">{analysisResult.description}</p>
                        </div>
                     </div>

                    {analysisResult.violation_found && (
                        <div className="flex items-center gap-2">
                             <p className="text-sm font-semibold">Violated Rule:</p>
                             <Badge variant={getResultVariant()}>{analysisResult.rule_id}</Badge>
                        </div>
                    )}
                 </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed rounded-md">
                    <p>Analysis results will be shown here.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
