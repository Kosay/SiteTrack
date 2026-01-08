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


const detectSafetyViolationsFlow = ai.defineFlow(
  {
    name: 'detectSafetyViolationsFlow',
    inputSchema: DetectSafetyViolationsInputSchema,
    outputSchema: DetectSafetyViolationsOutputSchema,
  },
  async input => {
    // URL to the raw text file in Firebase Storage. 
    // This URL must be publicly accessible.
    const safetyRulesUrl = 'https://firebasestorage.googleapis.com/v0/b/studio-7211011860-c8b46.appspot.com/o/safety_rules.txt?alt=media';

    let safetyRules = '';
    try {
      const response = await fetch(safetyRulesUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch safety rules: ${response.statusText}`);
      }
      safetyRules = await response.text();
    } catch (error) {
      console.error("Error fetching safety rules:", error);
      // Fallback to a default set of rules if fetching fails
      safetyRules = 'Default Safety Rule: All personnel must wear hard hats.';
    }

    const prompt = `You are an AI safety inspector for construction sites in the UAE. Your analysis must be grounded in the provided safety regulations.

      **Safety Regulations (Source of Truth):**
      ---
      ${safetyRules}
      ---

      **Your Task:**
      Analyze the following image and identify any violations **based strictly on the regulations provided above**. For each violation, state the rule that was broken. If there are no violations, state that clearly.

      Image: {{media url=imageDataUri}}

      Output the results as a JSON object.
    `;

    const {output} = await ai.generate({
        prompt: prompt,
        input: input,
        model: 'googleai/gemini-2.5-flash',
        output: {
            schema: DetectSafetyViolationsOutputSchema,
        }
    });

    return output!;
  }
);


export async function detectSafetyViolations(
  input: DetectSafetyViolationsInput
): Promise<DetectSafetyViolationsOutput> {
  return detectSafetyViolationsFlow(input);
}
