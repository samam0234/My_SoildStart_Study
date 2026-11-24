import { defineWebSocketHandler } from "nitro";
import { subscribe } from "../../src/server/announcements";
import { config } from "../../src/server/config";
const cleanups = new Map();
function remove(id) {
    cleanups.get(id)?.();
    cleanups.delete(id);
}
export default defineWebSocketHandler({
    upgrade(request) {
        if (request.headers.get("origin") !== config().origin)
            return new Response(null, { status: 403 });
    },
    open(peer) {
        if (cleanups.size >= 100) {
            peer.close(1013, "Too many connections");
            return;
        }
        cleanups.set(peer.id, subscribe((message) => peer.send(message)));
        peer.send(JSON.stringify({ kind: "connected" }));
    },
    close(peer) { remove(peer.id); },
    error(peer) { remove(peer.id); }
});
