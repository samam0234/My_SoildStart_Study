type Listener = (event: string) => void;
const runtime = globalThis as typeof globalThis & { solidStartStudyListeners?: Set<Listener> };
const listeners = runtime.solidStartStudyListeners ??= new Set<Listener>();

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function announce(kind: "post-created" | "post-updated" | "post-deleted" | "comment-changed") {
  const message = JSON.stringify({ kind });
  for (const listener of listeners) {
    try { listener(message); }
    catch { listeners.delete(listener); }
  }
}
