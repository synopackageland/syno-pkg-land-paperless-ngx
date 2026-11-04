## 3.4.0-0006

Install wizard: port conflicts only warn; shared folder selection fixed

Rebuilt with CLI 0.47.4; SDK/UI pins retained. No tests, NAS installs or live checks were run
Approval retention is unknown because the current inspector rejects the previous release’s legacy wizard baseline

# Release notes

## 3.4.0-0009

OIDC sign-in callbacks preserve the HTTP or HTTPS scheme used to open the App.
The loopback identity gateway supplies the trusted forwarded protocol.
HTTP remains available with the existing security warning; no HTTPS redirect is forced.
Upstream remains 3.4.0, with the same pinned official images and nonroot execution.

## 3.4.0-0003: CLI and SDK rebuild candidate

Built with CLI 0.42.2, SDK/App 0.42.0 and templates 0.37.0; the published SDK
uses executor/v0.39.0. Upstream remains 3.4.0. Local x86_64 checks and an
in-place upgrade pass. DSM administrator access through the generated menu
entry works; the requested daemon-ingress path returns 404 for this Compose
package and needs coordinator review before release. No release was published.


## 3.3.3-0011: SDK entry-gate migration

Built with SDK/App/templates 0.32.0, CLI 0.34.0 and executor v0.32.0.
Only `/api` use upstream authentication; all other browser paths retain the DSM entry gate.
Protected executor payloads changed: administrator approval is required again after upgrading.
No NAS installation or device acceptance was performed for this rebuild.

## 3.3.3-0010 — Redesigned DSM menu launch page

- The page shown when an App can't be opened from the DSM menu is redesigned and now explains when the App's port isn't reachable from outside
- 重新設計從 DSM 選單無法開啟 App 時顯示的頁面，並說明 App 的連接埠無法從外部連線的情況
