import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(2, "Name must be at last 2 characters"),
  callbackBaseUrl: z.url("Enter a valid URL, including http:// or https://"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
