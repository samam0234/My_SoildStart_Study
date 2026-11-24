import { createSignal, onCleanup, onMount } from "solid-js";
import { revalidate } from "@solidjs/router";
import { getPost, getPosts } from "../features/board-data";
export function LiveStatus() {
    const [status, setStatus] = createSignal("알림 연결 준비 중");
    let socket;
    onMount(() => {
        const url = new URL("/ws", location.href);
        url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
        socket = new WebSocket(url);
        socket.onopen = () => setStatus("실시간 알림 연결됨");
        socket.onmessage = (message) => {
            if (JSON.parse(message.data).kind === "connected")
                return;
            setStatus("게시판 변경 감지 · " + new Date().toLocaleTimeString());
            void revalidate([getPosts.key, getPost.key]);
        };
        socket.onerror = socket.onclose = () => setStatus("알림 연결 종료 · 새로고침으로 재연결");
    });
    onCleanup(() => socket?.close());
    return <p role="status">{status()}</p>;
}
