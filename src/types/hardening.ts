export interface HardenEntry {
  path: string;
  kind: "directory" | "file";
  expectedMode: number;
  actualMode: number | null;
  status: "ok" | "fixed" | "error";
  error?: string;
}

export interface HardenReport {
  timestamp: string;
  platform: string;
  entries: HardenEntry[];
  totalChecked: number;
  totalFixed: number;
  totalErrors: number;
}
