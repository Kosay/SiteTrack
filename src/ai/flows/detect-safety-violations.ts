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
    
    const prompt = `You are an AI safety inspector for construction sites in the UAE. Your analysis must be grounded in the provided general safety regulations.

      **General UAE Construction Safety Regulations (Source of Truth):**
      ---
      1.  **Personal Protective Equipment (PPE):** All personnel must wear appropriate PPE, including hard hats, safety boots, and high-visibility vests at all times.
      2.  **Fall Protection:** Any work at a height of 2 meters or more requires fall protection (e.g., guardrails, safety nets, personal fall arrest systems).
      3.  **Excavations:** Excavations deeper than 1.2 meters must be shored or sloped to prevent collapse. Barriers must be placed around all excavations.
      4.  **Scaffolding:** All scaffolding must be erected on stable ground, fully planked, and include guardrails if over 2 meters high.
      5.  **Housekeeping:** The site must be kept clean and orderly. Walkways and work areas must be clear of debris, materials, and tripping hazards.
      6.  **Fire Safety:** Adequate fire extinguishers must be available, clearly marked, and accessible.
      ---

      **Your Task:**
      Analyze the following image and identify any violations **based strictly on the regulations provided above**. For each violation, state the rule that was broken. If there are no violations, state that clearly.

      Image: {{media url=imageDataUri}}

      Output the results as a JSON object.
    `;

    const {output} = await ai.generate({
        prompt: prompt,
        input: input,
        model: 'googleai/gemini-pro-vision',
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
