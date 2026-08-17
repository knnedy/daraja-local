export interface ProjectSettings {
  projectId: number;
  callbackUrl: string;
  stkTimeoutSeconds: number;
  c2bResponseType: "Completed" | "Cancelled";
  externalValidationDefault: boolean;
  defaultPhoneNumber: string;
}

export type SettingsResponse = ProjectSettings;
