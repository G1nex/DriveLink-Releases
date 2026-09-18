# DriveLink-Releases

Public release metadata and signed vehicle access registry for DriveLink.

## Vehicle registry

Edit only `vehicle-registry.source.json`. Do not edit `vehicle-registry.json`,
`vehicle-registry.sig`, or `entitlementSignature` values manually.

The `Sign vehicle registry` workflow validates VIN hashes and modules, signs every
vehicle entitlement, signs the complete registry, and commits the generated files.

Repository Actions must contain the secret `VEHICLE_REGISTRY_SIGNING_KEY` with the
PEM ECDSA P-256 private key matching the public key embedded in the DriveLink app.
The private key must never be committed to this repository.

To sign locally:

```bash
export VEHICLE_REGISTRY_SIGNING_KEY="$(cat /secure/path/vehicle-registry-private-key.pem)"
python3 tools/sign_vehicle_registry.py
```
