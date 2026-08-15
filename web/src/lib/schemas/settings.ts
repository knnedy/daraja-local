import { z } from "zod";

export const updateSettingsSchema = z.object({
  callbackUrl: z.url("Enter a valid URL, including http:// or https://"),
  stkTimeoutSeconds: z
    .number()
    .int()
    .min(5, "Timeout must be at least 5 seconds")
    .max(60, "Timeout must be at most 60 seconds"),
  c2bResponseType: z.enum(["Completed", "Cancelled"]),
  externalValidationDefault: z.boolean(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
