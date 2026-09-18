#!/usr/bin/env python3
import base64
import json
import os
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "vehicle-registry.source.json"
OUTPUT = ROOT / "vehicle-registry.json"
SIGNATURE = ROOT / "vehicle-registry.sig"
KEY_ENV = "VEHICLE_REGISTRY_SIGNING_KEY"

MODULE_ORDER = [
    "Can", "IBus", "Cantcu", "ClusterText", "CanTransmit",
    "PreferCantcu", "Engine", "Transmission", "Chassis"
]

def sign(data: bytes, key_path: str) -> str:
    result = subprocess.run(
        ["openssl", "dgst", "-sha256", "-sign", key_path],
        input=data, check=True, capture_output=True)
    return base64.b64encode(result.stdout).decode("ascii")

def canonical_modules(value: str) -> str:
    requested = {part.strip() for part in value.split(",") if part.strip()}
    unknown = requested.difference(MODULE_ORDER)
    if unknown:
        raise ValueError(f"Unknown modules: {', '.join(sorted(unknown))}")
    return ",".join(module for module in MODULE_ORDER if module in requested)

def main() -> None:
    private_key = os.environ.get(KEY_ENV)
    if not private_key:
        raise SystemExit(f"{KEY_ENV} is not set")

    with tempfile.NamedTemporaryFile("w", delete=False) as key:
        key.write(private_key)
        key_path = key.name

    try:
        os.chmod(key_path, 0o600)
        registry = json.loads(SOURCE.read_text(encoding="utf-8"))
        if registry.get("version") != 1:
            raise ValueError("Only registry version 1 is supported")

        seen = set()
        for vehicle in registry.get("vehicles", []):
            vin_hash = vehicle["vinHash"].strip().upper()
            if len(vin_hash) != 64 or any(c not in "0123456789ABCDEF" for c in vin_hash):
                raise ValueError(f"Invalid VIN hash: {vin_hash}")
            if vin_hash in seen:
                raise ValueError(f"Duplicate VIN hash: {vin_hash}")
            seen.add(vin_hash)

            modules = canonical_modules(vehicle["modules"])
            vehicle["vinHash"] = vin_hash
            vehicle["modules"] = ", ".join(modules.split(","))
            message = f"DriveLink.VehicleEntitlement.v1|{vin_hash}|{modules}".encode()
            vehicle["entitlementSignature"] = sign(message, key_path)

        payload = (json.dumps(registry, indent=2, ensure_ascii=False) + "\n").encode()
        OUTPUT.write_bytes(payload)
        SIGNATURE.write_text(sign(payload, key_path) + "\n", encoding="ascii")
        print(f"Signed {len(registry.get('vehicles', []))} vehicle(s)")
    finally:
        os.unlink(key_path)

if __name__ == "__main__":
    main()
