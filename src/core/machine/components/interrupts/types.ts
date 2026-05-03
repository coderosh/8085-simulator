export type RestartInterrupt = "rst55" | "rst65" | "rst75";

export interface InterruptSnapshot {
  enabled: boolean;
  masks: Record<RestartInterrupt, boolean>;
  pending: Record<RestartInterrupt, boolean>;
  serialInput: boolean;
  serialOutput: boolean;
  serialOutputEnabled: boolean;
}
