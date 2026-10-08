function toUint8Array(value) {
    if (value instanceof Uint8Array) {
        return value;
    }

    if (value instanceof ArrayBuffer) {
        return new Uint8Array(value);
    }

    return Uint8Array.from(value);
}

export async function verifyP256Sha256(publicKeyBytes, dataBytes, signatureBytes) {
    if (!globalThis.crypto?.subtle) {
        throw new Error("Web Crypto is not available in this browser context.");
    }

    const publicKey = toUint8Array(publicKeyBytes);
    if (publicKey.length !== 64) {
        throw new Error("DriveLink Gateway public key must be 64 bytes.");
    }

    const rawPoint = new Uint8Array(65);
    rawPoint[0] = 0x04;
    rawPoint.set(publicKey, 1);

    const key = await globalThis.crypto.subtle.importKey(
        "raw",
        rawPoint,
        {
            name: "ECDSA",
            namedCurve: "P-256"
        },
        false,
        ["verify"]);

    return await globalThis.crypto.subtle.verify(
        {
            name: "ECDSA",
            hash: "SHA-256"
        },
        key,
        toUint8Array(signatureBytes),
        toUint8Array(dataBytes));
}
