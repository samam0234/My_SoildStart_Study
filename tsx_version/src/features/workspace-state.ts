import { createStore } from "solid-js/store";

export type WorkspaceDocument = { id: number; filename: string; byteSize: number };
export type HistoryEntry = { id: number; question: string; answer: string };
export function createWorkspaceState() {
  return createStore({
    documents: [] as WorkspaceDocument[],
    history: [] as HistoryEntry[],
    selected: 0,
    pending: false,
    result: "",
    error: ""
  });
}
