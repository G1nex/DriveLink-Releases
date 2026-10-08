const sessions = new Map();

const dbName = "drivelink-studio-recordings";
const dbVersion = 1;
const sessionsStore = "sessions";
const chunksStore = "chunks";
const recoveryBatchBytes = 256 * 1024;
const recoveryFlushMilliseconds = 750;

export async function create(fileName) {
    const id = crypto.randomUUID();
    let writable = null;

    if ("showSaveFilePicker" in window) {
        const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
                description: "DriveLink recording",
                accept: { "application/octet-stream": [".dlrec"] }
            }]
        });

        writable = await handle.createWritable();
    }

    const session = {
        id,
        fileName,
        writable,
        chunks: writable ? null : [],
        recoveryEnabled: false,
        recoveryPending: [],
        recoveryPendingBytes: 0,
        recoveryIndex: 0,
        recoveryPersistedBytes: 0,
        recoveryLastFlush: performance.now(),
        createdUtc: new Date().toISOString()
    };

    sessions.set(id, session);

    try {
        await putRecoverySession({
            id,
            fileName,
            createdUtc: session.createdUtc,
            updatedUtc: session.createdUtc,
            bytesPersisted: 0
        });

        session.recoveryEnabled = true;
    } catch {
        session.recoveryEnabled = false;
    }

    return id;
}

export async function write(id, bytes) {
    const session = sessions.get(id);
    if (!session) {
        throw new Error("Recording session is not available.");
    }

    const data = bytes instanceof Uint8Array
        ? bytes
        : new Uint8Array(bytes);

    if (session.writable) {
        await session.writable.write(data);
    } else {
        session.chunks.push(data.slice());
    }

    queueRecovery(session, data);

    if (shouldFlushRecovery(session)) {
        await flushRecovery(session);
    }
}

export async function close(id) {
    const session = sessions.get(id);
    if (!session) {
        return;
    }

    await flushRecovery(session);

    if (session.writable) {
        await session.writable.close();
    } else {
        downloadBlob(
            session.fileName,
            new Blob(
                session.chunks,
                { type: "application/octet-stream" }));
    }

    sessions.delete(id);

    if (session.recoveryEnabled) {
        await deleteRecovery(id);
    }
}

export async function abort(id) {
    const session = sessions.get(id);
    if (!session) {
        return;
    }

    sessions.delete(id);

    if (session.writable) {
        await session.writable.abort();
    }

    if (session.recoveryEnabled) {
        await deleteRecovery(id);
    }
}

export async function listRecoveries() {
    try {
        const db = await openDatabase();

        return await new Promise((resolve, reject) => {
            const transaction =
                db.transaction(
                    sessionsStore,
                    "readonly");

            const request =
                transaction
                    .objectStore(sessionsStore)
                    .getAll();

            request.onsuccess = () => {
                const result =
                    (request.result ?? [])
                        .filter(
                            item =>
                                item.bytesPersisted > 0)
                        .sort(
                            (left, right) =>
                                right.createdUtc.localeCompare(
                                    left.createdUtc));

                resolve(result);
            };

            request.onerror = () =>
                reject(request.error);
        });
    } catch {
        return [];
    }
}

export async function recover(id) {
    const recovery =
        await getRecoverySession(id);

    if (!recovery) {
        throw new Error(
            "Recovery recording is not available.");
    }

    const chunks =
        await getRecoveryChunks(id);

    if (chunks.length === 0) {
        throw new Error(
            "Recovery recording does not contain persisted data.");
    }

    const fileName =
        recoveredFileName(
            recovery.fileName);

    downloadBlob(
        fileName,
        new Blob(
            chunks.map(item => item.data),
            { type: "application/octet-stream" }));

    await deleteRecovery(id);

    return fileName;
}

export async function discardRecovery(id) {
    await deleteRecovery(id);
}

function queueRecovery(session, data) {
    if (!session.recoveryEnabled) {
        return;
    }

    const copy = data.slice();

    session.recoveryPending.push(copy);
    session.recoveryPendingBytes += copy.byteLength;
}

function shouldFlushRecovery(session) {
    if (!session.recoveryEnabled ||
        session.recoveryPendingBytes === 0) {
        return false;
    }

    if (session.recoveryPendingBytes >=
        recoveryBatchBytes) {
        return true;
    }

    return performance.now() -
        session.recoveryLastFlush >=
        recoveryFlushMilliseconds;
}

async function flushRecovery(session) {
    if (!session.recoveryEnabled ||
        session.recoveryPendingBytes === 0) {
        return;
    }

    const chunks = session.recoveryPending;
    const length = session.recoveryPendingBytes;

    session.recoveryPending = [];
    session.recoveryPendingBytes = 0;

    const combined = new Uint8Array(length);
    let offset = 0;

    for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.byteLength;
    }

    try {
        await putRecoveryChunk({
            sessionId: session.id,
            index: session.recoveryIndex,
            data: combined
        });

        session.recoveryIndex++;
        session.recoveryPersistedBytes +=
            combined.byteLength;

        session.recoveryLastFlush =
            performance.now();

        await putRecoverySession({
            id: session.id,
            fileName: session.fileName,
            createdUtc: session.createdUtc,
            updatedUtc: new Date().toISOString(),
            bytesPersisted:
                session.recoveryPersistedBytes
        });
    } catch {
        session.recoveryEnabled = false;
    }
}

function recoveredFileName(fileName) {
    const lower = fileName.toLowerCase();

    if (lower.endsWith(".dlrec")) {
        return fileName.slice(
            0,
            fileName.length - 6) +
            "_recovered.dlrec";
    }

    return fileName +
        "_recovered.dlrec";
}

function downloadBlob(fileName, blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = "none";

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(
        () => URL.revokeObjectURL(url),
        0);
}

async function openDatabase() {
    return await new Promise(
        (resolve, reject) => {
            const request =
                indexedDB.open(
                    dbName,
                    dbVersion);

            request.onupgradeneeded = () => {
                const db = request.result;

                if (!db.objectStoreNames.contains(
                        sessionsStore)) {
                    db.createObjectStore(
                        sessionsStore,
                        { keyPath: "id" });
                }

                if (!db.objectStoreNames.contains(
                        chunksStore)) {
                    const store =
                        db.createObjectStore(
                            chunksStore,
                            {
                                keyPath: [
                                    "sessionId",
                                    "index"
                                ]
                            });

                    store.createIndex(
                        "sessionId",
                        "sessionId",
                        { unique: false });
                }
            };

            request.onsuccess = () =>
                resolve(request.result);

            request.onerror = () =>
                reject(request.error);
        });
}

async function putRecoverySession(value) {
    const db = await openDatabase();

    await transactionRequest(
        db,
        sessionsStore,
        "readwrite",
        store => store.put(value));
}

async function putRecoveryChunk(value) {
    const db = await openDatabase();

    await transactionRequest(
        db,
        chunksStore,
        "readwrite",
        store => store.put(value));
}

async function getRecoverySession(id) {
    const db = await openDatabase();

    return await transactionRequest(
        db,
        sessionsStore,
        "readonly",
        store => store.get(id));
}

async function getRecoveryChunks(id) {
    const db = await openDatabase();

    return await new Promise(
        (resolve, reject) => {
            const transaction =
                db.transaction(
                    chunksStore,
                    "readonly");

            const store =
                transaction.objectStore(
                    chunksStore);

            const index =
                store.index(
                    "sessionId");

            const request =
                index.getAll(
                    IDBKeyRange.only(id));

            request.onsuccess = () => {
                const result =
                    (request.result ?? [])
                        .sort(
                            (left, right) =>
                                left.index -
                                right.index);

                resolve(result);
            };

            request.onerror = () =>
                reject(request.error);
        });
}

async function deleteRecovery(id) {
    const db = await openDatabase();

    const chunks =
        await getRecoveryChunks(id);

    await new Promise(
        (resolve, reject) => {
            const transaction =
                db.transaction(
                    [
                        sessionsStore,
                        chunksStore
                    ],
                    "readwrite");

            transaction
                .objectStore(sessionsStore)
                .delete(id);

            const chunkStore =
                transaction.objectStore(
                    chunksStore);

            for (const chunk of chunks) {
                chunkStore.delete([
                    chunk.sessionId,
                    chunk.index
                ]);
            }

            transaction.oncomplete = () =>
                resolve();

            transaction.onerror = () =>
                reject(transaction.error);

            transaction.onabort = () =>
                reject(transaction.error);
        });
}

async function transactionRequest(
    db,
    storeName,
    mode,
    createRequest) {
    return await new Promise(
        (resolve, reject) => {
            const transaction =
                db.transaction(
                    storeName,
                    mode);

            const store =
                transaction.objectStore(
                    storeName);

            const request =
                createRequest(store);

            request.onsuccess = () =>
                resolve(request.result);

            request.onerror = () =>
                reject(request.error);
        });
}
