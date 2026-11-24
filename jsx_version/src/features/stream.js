export async function responseData(response) {
    if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error.code + " · " + error.message);
    }
    return (await response.json()).data;
}
export async function readAnswer(response, append) {
    if (!response.ok)
        await responseData(response);
    if (!response.body)
        throw new Error("응답 스트림이 없습니다.");
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    try {
        while (true) {
            const part = await reader.read();
            if (part.done)
                throw new Error("응답이 중간에 끝났습니다.");
            buffer += part.value;
            const frames = buffer.split("\n\n");
            buffer = frames.pop() ?? "";
            for (const frame of frames) {
                if (!frame.startsWith("data: "))
                    continue;
                const event = JSON.parse(frame.slice(6));
                if (event.error)
                    throw new Error(event.error.message);
                if (event.done)
                    return;
                if (typeof event.text === "string")
                    append(event.text);
            }
        }
    }
    finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
    }
}
