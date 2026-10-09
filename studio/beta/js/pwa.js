(() => {
    "use strict";

    let registration;
    let requestedActivation = false;
    let updateGuard;
    const supported = "serviceWorker" in navigator && window.isSecureContext;

    function showUpdate() {
        const banner = document.getElementById("studio-pwa-update");
        if (banner) banner.hidden = false;
    }

    function watchInstalling(worker) {
        if (!worker) return;
        worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
                showUpdate();
            }
        });
    }

    async function ensureRegistered() {
        if (!supported) return null;
        if (registration) return registration;
        registration = await navigator.serviceWorker.register(
            new URL("service-worker.js", document.baseURI),
            { scope: new URL("./", document.baseURI).pathname, updateViaCache: "none" }
        );
        if (registration.waiting) showUpdate();
        registration.addEventListener("updatefound", () =>
            watchInstalling(registration.installing));
        watchInstalling(registration.installing);
        return registration;
    }

    async function checkForUpdates() {
        if (!supported) {
            return "Offline installation requires HTTPS or localhost and a compatible browser.";
        }
        try {
            const current = await ensureRegistered();
            await current.update();
            if (current.waiting) {
                showUpdate();
                return "Update ready. Save any recording, then select APPLY UPDATE.";
            }
            return "Update check finished. New builds will appear in a banner when ready.";
        } catch {
            return "Cannot check for updates right now. Try again when internet is available.";
        }
    }

    async function applyUpdate() {
        if (!registration?.waiting) return;

        const banner = document.getElementById("studio-pwa-update");
        const message = banner?.querySelector("span");
        const apply = document.getElementById("studio-pwa-apply-update");

        // Fail closed if Blazor has not registered its recording-state guard.
        if (!updateGuard) {
            if (message) message.textContent = "Studio is still loading. Try applying the update again.";
            return;
        }

        if (apply) apply.disabled = true;
        try {
            // StudioRecordingController is the single source of truth.
            const allowed = await updateGuard.invokeMethodAsync("CanApplyStudioUpdate");
            if (!allowed) {
                if (message) message.textContent = "Stop the recording and finish saving it before updating Studio.";
                return;
            }

            if (!registration.waiting) return;
            requestedActivation = true;
            registration.waiting.postMessage({ type: "DRIVELINK_ACTIVATE_UPDATE" });
        } catch {
            if (message) message.textContent = "Cannot verify recording state. Update was not applied.";
        } finally {
            if (apply) apply.disabled = false;
        }
    }

    function setUpdateGuard(guard) {
        updateGuard = guard;
    }

    function clearUpdateGuard() {
        updateGuard = undefined;
    }

    function initialize() {
        const apply = document.getElementById("studio-pwa-apply-update");
        const later = document.getElementById("studio-pwa-later");
        apply?.addEventListener("click", applyUpdate);
        later?.addEventListener("click", () => {
            const banner = document.getElementById("studio-pwa-update");
            if (banner) banner.hidden = true;
        });
        if (!supported) return;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (requestedActivation) location.reload();
        });
        ensureRegistered().catch(() => {
            // Studio still works as a regular web app if PWA setup is blocked.
        });
        window.addEventListener("focus", () => {
            registration?.update().catch(() => {});
        });
    }

    window.DriveLinkPwa = { checkForUpdates, setUpdateGuard, clearUpdateGuard };
    if (document.readyState === "complete") initialize();
    else window.addEventListener("load", initialize, { once: true });
})();
