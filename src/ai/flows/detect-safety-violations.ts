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
  prompt: `You are an AI safety inspector for construction sites in the UAE. Your analysis must be grounded in the provided safety regulations.

  **Safety Regulations (Source of Truth):**
  1.  **Personal Protective Equipment (PPE) - UAE CoP 2.0 & Emaar Standards:**
      *   All personnel must wear a hard hat (color-coded by role if possible) at all times on site.
      *   High-visibility vests are mandatory for all workers.
      *   Safety footwear (steel-toed boots) is required.
      *   Gloves appropriate for the task must be worn.
      *   Safety glasses are required, especially during cutting, grinding, or drilling operations.

  2.  **Scaffolding - Al Dar & DAMAC Client Rules:**
      *   All scaffolding must have a green 'Safe to Use' tag, visually verified and dated within the last 7 days. Red tags ('Unsafe') must be strictly observed.
      *   Guardrails (top-rail, mid-rail) and toeboards must be present on all working platforms above 2 meters.
      *   Full planking is required on all working levels. No gaps are permitted between planks.
      *   Safe access (e.g., an integrated ladder) must be provided.

  **Your Task:**
  Analyze the following image and identify any violations **based strictly on the regulations provided above**. For each violation, state the rule that was broken. If there are no violations, state that clearly.

  Image: {{media url=imageDataUri}}

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
