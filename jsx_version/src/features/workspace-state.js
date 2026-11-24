import { createStore } from "solid-js/store";
export function createWorkspaceState() {
    return createStore({
        documents: [],
        history: [],
        selected: 0,
        pending: false,
        result: "",
        error: ""
    });
}
