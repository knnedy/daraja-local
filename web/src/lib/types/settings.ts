export interface ProjectSettings {
  projectId: number;
  stkTimeoutSeconds: number;
  defaultPhoneNumber: string;
}

export type SettingsResponse = ProjectSettings;
