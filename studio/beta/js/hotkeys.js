let listener = null;

export function register(dotNetRef) {
    unregister();

    listener = async event => {
        if (event.defaultPrevented ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey) {
            return;
        }

        const target = event.target;
        const tag = target?.tagName?.toLowerCase();

        if (tag === "input" ||
            tag === "textarea" ||
            tag === "select" ||
            target?.isContentEditable) {
            return;
        }

        const key = mapKey(event);

        if (!key) {
            return;
        }

        event.preventDefault();

        await dotNetRef.invokeMethodAsync(
            "OnStudioHotkey",
            key);
    };

    window.addEventListener("keydown", listener);
}

export function unregister() {
    if (!listener) {
        return;
    }

    window.removeEventListener("keydown", listener);
    listener = null;
}

function mapKey(event) {
    if (event.code === "Space") return "PlayPause";
    if (event.key === "Escape") return "ClearSelection";
    if (event.key === "ArrowLeft") return "PreviousPull";
    if (event.key === "ArrowRight") return "NextPull";

    const key = event.key?.toLowerCase();

    if (key === "r") return "Record";
    if (key === "m") return "Marker";
    if (key === "f") return "FollowLive";

    return null;
}
