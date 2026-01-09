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
  violation_found: z.boolean().describe("Set to true if a violation is found, otherwise false."),
  rule_id: z.string().describe("The ID of the rule that was violated (e.g., R1, L2). Empty if no violation."),
  description: z.string().describe("A brief explanation of the hazard or confirmation of safety.")
});
export type DetectSafetyViolationsOutput = z.infer<typeof DetectSafetyViolationsOutputSchema>;


const detectSafetyViolationsFlow = ai.defineFlow(
  {
    name: 'detectSafetyViolationsFlow',
    inputSchema: DetectSafetyViolationsInputSchema,
    outputSchema: DetectSafetyViolationsOutputSchema,
  },
  async input => {

    const uaeSafetyRulesTest = `
      **1. Logistics Road & Site Traffic (CoP 44.0)**
      - **Rule R1 (Segregation):** Pedestrian and vehicle routes must be clearly segregated using physical barriers (e.g., plastic water-filled barriers or concrete Jersey barriers).
      - **Rule R2 (Signage):** All logistics roads must have visible speed limit signs (standard 20km/h for sites) and directional arrows.
      - **Rule R3 (Surface Condition):** Roads must be free of significant obstructions, deep ruts, or standing water that could cause equipment instability.

      **2. Loading & Unloading Operations (CoP 34.0)**
      - **Rule L1 (Ground Stability):** Equipment (like MEWPs or Cranes) must be positioned on stable, level ground. Outriggers must be fully extended and placed on spreader pads/mats.
      - **Rule L2 (Exclusion Zone):** A physical exclusion zone (cones or tape) must be established around the loading area to prevent unauthorized pedestrian entry.
      - **Rule L3 (Securing):** Any vehicle being loaded/unloaded must have its engine off, parking brake engaged, and wheels chocked.

      **3. Tipping & Dumping Operations**
      - **Rule T1 (Overhead Clearance):** Tipping is prohibited directly under or near overhead power lines or low-hanging structures.
      - **Rule T2 (Banksperson/Spotter):** A dedicated spotter wearing a high-visibility vest (different color from the crew, usually orange or transparent green) must be present and visible to the driver.
      - **Rule T3 (Edge Protection):** When tipping into excavations or stockpiles, "Stop Blocks" or berms must be present to prevent the vehicle from over-running the edge.
    `;
    
    const prompt = `You are a certified UAE OSHAD Safety Auditor. I will provide an image from a construction site.

      Analyze the image against the provided uaeSafetyRulesTest.
      
      uaeSafetyRulesTest:
      ---
      ${uaeSafetyRulesTest}
      ---
      
      If you see a violation, identify the Rule ID (e.g., R1, L2, T3).
      Provide a brief explanation of the hazard.
      Assign a status: 'Grade C' for any violation found.
      If no violation is found, set violation_found to false and provide a positive confirmation in the description.
      
      Return the result in JSON format only.
      
      Image: {{media url=imageDataUri}}
    `;

    const {output} = await ai.generate({
        prompt: prompt,
        input: input,
        model: 'googleai/gemini-1.5-flash',
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
