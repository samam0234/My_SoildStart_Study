const runtime = globalThis;
const listeners = runtime.solidStartStudyListeners ??= new Set();
export function subscribe(listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}
export function announce(kind) {
    const message = JSON.stringify({ kind });
    for (const listener of listeners) {
        try {
            listener(message);
        }
        catch {
            listeners.delete(listener);
        }
    }
}
