let context = null;

export async function arm() {
    const AudioContextType =
        window.AudioContext ||
        window.webkitAudioContext;

    if (!AudioContextType) {
        return false;
    }

    if (!context) {
        context =
            new AudioContextType();
    }

    if (context.state === "suspended") {
        try {
            await context.resume();
        } catch {
            return false;
        }
    }

    return context.state === "running";
}

export async function playWarning() {
    if (!context) {
        return false;
    }

    if (context.state === "suspended") {
        try {
            await context.resume();
        } catch {
            return false;
        }
    }

    if (context.state !== "running") {
        return false;
    }

    const now =
        context.currentTime;

    const oscillator =
        context.createOscillator();

    const gain =
        context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(
        880,
        now);

    gain.gain.setValueAtTime(
        0.0001,
        now);

    gain.gain.exponentialRampToValueAtTime(
        0.12,
        now + 0.01);

    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 0.18);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.20);

    return true;
}

export async function dispose() {
    if (!context) {
        return;
    }

    try {
        await context.close();
    } finally {
        context = null;
    }
}
