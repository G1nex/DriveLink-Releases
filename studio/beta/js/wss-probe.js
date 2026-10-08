// Test the browser's actual TLS/WSS handshake without bypassing certificate checks.
// No credentials, DriveLink binary frames or privileged commands are sent.
export function probeWss(url, timeoutMs = 7000) {
    if (typeof url !== "string" || !url.startsWith("wss://")) {
        return Promise.resolve(false);
    }

    return new Promise((resolve) => {
        let socket;
        let finished = false;
        let timeout;

        const finish = (succeeded) => {
            if (finished) {
                return;
            }
            finished = true;
            clearTimeout(timeout);
            if (socket) {
                try {
                    socket.close();
                } catch {
                    // A failed browser socket is not a functional Gateway session.
                }
            }
            resolve(succeeded);
        };

        try {
            socket = new WebSocket(url);
            socket.binaryType = "arraybuffer";
            socket.onopen = () => finish(true);
            socket.onerror = () => finish(false);
            socket.onclose = () => finish(false);
            timeout = setTimeout(() => finish(false), Math.min(12000, Math.max(1000, timeoutMs)));
        } catch {
            finish(false);
        }
    });
}
