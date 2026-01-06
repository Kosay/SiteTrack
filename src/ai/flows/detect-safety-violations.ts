'use server';

/**
 * @fileOverview This file defines a Genkit flow for detecting safety violations in construction site images.
 *
 * It includes:
 * - `detectSafetyViolations`: An exported function to initiate the safety violation detection flow.
 * - `DetectSafetyViolationsInput`: The input type for the detectSafetyViolations function.
 * - `DetectSafetyViolationsOutput`: The output type for the detectSafetyViolations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectSafetyViolationsInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      'A construction site image, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type DetectSafetyViolationsInput = z.infer<typeof DetectSafetyViolationsInputSchema>;

const DetectSafetyViolationsOutputSchema = z.object({
  violations: z
    .array(z.string())
    .describe('A list of potential safety violations detected in the image.'),
  isSafe: z.boolean().describe('Whether or not the image appears to be safe.'),
});
export type DetectSafetyViolationsOutput = z.infer<typeof DetectSafetyViolationsOutputSchema>;

export async function detectSafetyViolations(
  input: DetectSafetyViolationsInput
): Promise<DetectSafetyViolationsOutput> {
  return detectSafetyViolationsFlow(input);
}

const detectSafetyViolationsPrompt = ai.definePrompt({
  name: 'detectSafetyViolationsPrompt',
  input: {schema: DetectSafetyViolationsInputSchema},
  output: {schema: DetectSafetyViolationsOutputSchema},
  prompt: `You are an AI safety inspector analyzing construction site images for safety violations.

  Analyze the following image and identify any potential safety violations. Provide a list of violations and a boolean indicating whether the image appears to be safe.

  Image: {{media url=imageDataUri}}

  Consider common violations such as:
  - Lack of personal protective equipment (PPE)
  - Unsafe use of tools or equipment
  - Obstructions or hazards in walkways
  - Improper scaffolding or fall protection
  - Fire hazards

  Output the results as a JSON object.
`,
});

const detectSafetyViolationsFlow = ai.defineFlow(
  {
    name: 'detectSafetyViolationsFlow',
    inputSchema: DetectSafetyViolationsInputSchema,
    outputSchema: DetectSafetyViolationsOutputSchema,
  },
  async input => {
    const {output} = await detectSafetyViolationsPrompt(input);
    return output!;
  }
);
