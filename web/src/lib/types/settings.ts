export interface ProjectSettings {
  projectId: number;
  callbackUrl: string;
  stkTimeoutSeconds: number;
  c2bResponseType: "Completed" | "Cancelled";
  externalValidationDefault: boolean;
}

export type SettingsResponse = ProjectSettings;
