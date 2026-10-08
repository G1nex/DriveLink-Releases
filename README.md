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

## DriveLink Studio Web App

**Open the web application without installing anything:**

- [Open Studio Beta](https://g1nex.github.io/DriveLink-Releases/studio/beta/)
- [Open Studio Stable](https://g1nex.github.io/DriveLink-Releases/studio/stable/) (after its first Stable publish)
- [Open Studio landing page](https://g1nex.github.io/DriveLink-Releases/)
  (automatically selects Stable if available, otherwise Beta)

The GitHub Pages site serves compiled Blazor WebAssembly files directly:
`index.html`, `_framework/`, CSS, JS and favicon. The app is public; the
interface and dependencies are downloaded to the browser. Pairing and client
authorization are still enforced on the Gateway.

**For current live Gateway telemetry**, download
[Studio Beta ZIP](https://github.com/G1nex/DriveLink-Releases/releases/tag/studio-web-beta),
extract it, then run `start-studio.cmd` on Windows (Python 3) or
`sh start-studio.sh` on macOS/Linux. The local HTTP server opens
`http://127.0.0.1:8765/` and can connect to
`ws://drivelink.local/drivelink/v1`.

GitHub Pages is HTTPS; the current Gateway only supports plaintext
`ws://`. Browsers block live WebSocket access from HTTPS Pages until
a browser-trusted WSS solution is implemented. Offline Replay and analysis
are usable through Pages; use the local ZIP for live connections.

Developers: [Studio publication guide in the source repository](https://github.com/G1nex/DriveLink/blob/feature/gateway-wifi-studio-connectivity/docs/studio-publishing.md).

Vehicle registry metadata is built and signed by the private source repo.
No signing keys are kept in this repository.
