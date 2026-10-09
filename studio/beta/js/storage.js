(() => {
    "use strict";

    const keyPrefix = "drivelink.studio.";
    const migrationOwnerKey = "drivelink.studio.storage-migration-owner.v1";
    const path = new URL(document.baseURI).pathname;
    const channel = /\/studio\/(beta|stable)\/$/.exec(path)?.[1] ?? null;

    function scopedKey(key) {
        if (!key.startsWith(keyPrefix)) {
            throw new Error("Unsupported Studio storage key.");
        }
        return channel ? keyPrefix + channel + "." + key.slice(keyPrefix.length) : key;
    }

    // The first updated channel to access legacy data owns its pairing
    // migration. The other channel starts with a new client identity and
    // requires normal Gateway approval, preventing accidental ID sharing.
    function getItem(key) {
        if (!channel) return localStorage.getItem(key);
        const scoped = scopedKey(key);
        const value = localStorage.getItem(scoped);
        if (value !== null) return value;
        if (localStorage.getItem(scoped + ".migrated") === "1") return null;

        const legacy = localStorage.getItem(key);
        if (legacy === null) return null;
        const owner = localStorage.getItem(migrationOwnerKey);
        if (owner && owner !== channel) return null;
        if (!owner) localStorage.setItem(migrationOwnerKey, channel);
        localStorage.setItem(scoped, legacy);
        return legacy;
    }

    function setItem(key, value) {
        const scoped = scopedKey(key);
        localStorage.setItem(scoped, value);
        if (channel) localStorage.setItem(scoped + ".migrated", "1");
    }

    function removeItem(key) {
        const scoped = scopedKey(key);
        localStorage.removeItem(scoped);
        if (channel) localStorage.setItem(scoped + ".migrated", "1");
    }

    window.DriveLinkStorage = { getItem, setItem, removeItem };
})();
