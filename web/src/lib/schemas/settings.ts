import { z } from "zod";

export const updateSettingsSchema = z.object({
  stkTimeoutSeconds: z
    .number()
    .int()
    .min(5, "Timeout must be at least 5 seconds")
    .max(60, "Timeout must be at most 60 seconds"),
  defaultPhoneNumber: z
    .string()
    .regex(/^254\d{9}$/, "Enter a valid number in the format 254XXXXXXXXX"),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
