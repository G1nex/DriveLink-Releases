# DriveLink Releases

DriveLink binaries are grouped into clearly named product/channel Releases.

| Product | Stable | Beta |
| --- | --- | --- |
| Android app | [DriveLink Android App](https://github.com/G1nex/DriveLink-Releases/releases/tag/android-app) | [DriveLink Android App (Beta)](https://github.com/G1nex/DriveLink-Releases/releases/tag/android-app-beta) |
| Web app | [DriveLink Studio Web App](https://github.com/G1nex/DriveLink-Releases/releases/tag/studio-web) | [DriveLink Studio Web App (Beta)](https://github.com/G1nex/DriveLink-Releases/releases/tag/studio-web-beta) |
| Gateway firmware | [DriveLink Gateway Firmware](https://github.com/G1nex/DriveLink-Releases/releases/tag/gateway-firmware) | [DriveLink Gateway Firmware (Beta)](https://github.com/G1nex/DriveLink-Releases/releases/tag/gateway-firmware-beta) |
| Exhaust firmware | [DriveLink Exhaust Valve Controller Firmware](https://github.com/G1nex/DriveLink-Releases/releases/tag/exhaust-firmware) | [DriveLink Exhaust Valve Controller Firmware (Beta)](https://github.com/G1nex/DriveLink-Releases/releases/tag/exhaust-firmware-beta) |

Links become available only after a verified build has been published.

## Automatic updates

Existing Android and Gateway update clients read app.json, app-beta.json,
firmware.json, firmware-beta.json and exhaust-valve-firmware.json directly
from this repository. Each manifest points to its own Release asset.
All downloads are checked by size and SHA-256.

## Studio Web App

Download the ZIP, extract it and run start-studio.cmd (Windows/Python 3)
or start-studio.sh (macOS/Linux). Studio opens at http://127.0.0.1:8765/
and connects via ws://drivelink.local/drivelink/v1. GitHub Releases hosts
downloads; browser-hosted HTTPS live telemetry requires Gateway WSS.

Vehicle registry metadata is built and signed by the private source repo.
No signing keys are kept in this repository.
