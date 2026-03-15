export interface ScaffoldSummary {
  name: string;
  projectType: string;
  description: string;
}

const scaffoldDescription = [
  "AgentWallet — Product Requirements Document",
  " prepared with the Harness Engineering and Orchestrator workflow.",
].join("");

export const scaffoldSummary: ScaffoldSummary = {
  name: "agentwallet",
  projectType: "Monorepo + CLI",
  description: scaffoldDescription,
};

export function getScaffoldSummary(): ScaffoldSummary {
  return scaffoldSummary;
}
