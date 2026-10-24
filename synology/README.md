# Paperless-ngx for DSM

## SDK 0.28.0 rebuild

Rebuild 3.3.3-0006 with published SDK/App/CLI/templates 0.28.0 (executor/v0.27.0), UI 0.14.4 and Go 1.26.10, with the SDK's slow-NAS startup defaults (generous health/readiness timing and a Starting status in the UI). Official images and application sources are unchanged. No NAS test was run for this rebuild.

3.3.3-0006 使用已發佈 SDK/App/CLI/templates 0.28.0（executor/v0.27.0）、UI 0.14.4 與 Go 1.26.10 重建，並採用 SDK 的慢速 NAS 啟動預設值（較寬鬆的健康/就緒檢查時間，以及介面中的「啟動中」狀態）。官方映像與上游程式維持原樣。此次重建未進行 NAS 實機測試。

## SDK 0.26.0 rebuild

Rebuild 3.3.3-0005 with published SDK/App/CLI/templates 0.26.0, UI 0.14.4 and Go 1.26.10. Maintainer: Syno Package Land. Official images and application sources are unchanged. Check the selected shared folder permissions before starting; grant the package account the required access in DSM.

3.3.3-0005 使用已發佈 SDK/App/CLI/templates 0.26.0、UI 0.14.4 與 Go 1.26.10 重建；維護者顯示為 Syno Package Land。 官方映像與上游程式維持原樣。 啟動前檢查所選共用資料夾權限；請在 DSM 授予套件帳號所需存取權限。

This fork keeps the upstream source and UI unchanged. DSM integration lives only
in `synology/`. Version `3.3.3-0003` references the official Paperless-ngx 3.3.3
Docker Hub image; its immutable index is identical to the upstream GHCR index.
The release tag is already an ancestor of this fork's development-history base.
The fork also retains later upstream development commits; the container executes
the pinned release, not those later commits.

## Runtime

Three official images run as the package UID/GID with all capabilities dropped
and no-new-privileges. The SDK starts and supervises the project through DSM
Container Manager. The Paperless container retains the official rootless `/init`
entrypoint, migrations, consumer, task queue, scheduler and web server.

PostgreSQL and Redis use private Unix sockets on a package-namespaced named
volume. Both TCP listeners are disabled. Paperless has explicit host networking
because the SDK's OIDC issuer is NAS loopback; its only HTTP listener is forced
to `127.0.0.1:28992`. The SDK exposes HTTPS on port 28993 and the loopback OIDC
issuer on 28991. No app-owned root helper or Docker socket is installed.

The named volume stores `paperless/{data,media,export,tessdata}`, the
Django signing key, PostgreSQL data, Redis data and private sockets under
`/var/tmp` inside the containers. All services use the same package identity.
Containers do not inherit a signed-in user's DSM filesystem ACL. Back up the
entire volume with the package stopped, including PostgreSQL and media together.

Private named volumes plus `storage_init` are the supported platform model.
At installation, select one existing DSM Shared Folder for **consume**. Then grant
**Read/Write** to `SynoPkgPaperlessNgx` in **Control Panel > Shared Folder > Edit >
Permissions > System internal user**. Selecting a folder does not grant access.
The nonroot container mounts it at `/consume`; the native consumer polls every
five seconds for reliable host-folder changes. Imported files are removed, so
use a dedicated inbox and keep backups. Files must grant the package account
read/write access too. Export remains in the private volume: the current native
install contract supports one selected share. No broad filesystem grant is used.

## DSM sign-in

The embedded SDK OIDC provider is the only configured social provider. The
upstream django-allauth integration uses signed `sub` as its identity key and
PKCE. Email is not used for automatic account linking. Local frontend login and
local signup are disabled; upstream social auto-signup and SSO redirect are
enabled. No second app password is created by this integration.

The signed `groups` claim maps `admin` to Paperless superuser/staff through
Paperless's native role-sync settings. Roles are reapplied on OIDC login;
ordinary accounts receive their own Paperless identity. Paperless permissions
and document ownership remain upstream behavior: ownerless documents may be
shared, and DSM identity does not imply per-user filesystem isolation.

DSM App admission and Paperless's own session are separate. The package declares
`entry: app-privilege`, issuer `access: dsm-users`, and
`upstream_access: public`; an administrator grants
ordinary users access through DSM Application Privileges. Roles and native login
are covered in the validation record. The gateway delegates all upstream routes
to Paperless authentication; DSM admission protects OIDC issuance. Paperless
maintains its own sessions, API authorization, CSRF and WebSocket policy.
Deleting a DSM account must not delete its Paperless account automatically:
Paperless can make ownerless documents visible after account deletion. Account
cleanup/revocation remains a documented gap pending a safe native adapter.

## OCR and optional services

Default OCR languages are `eng+chi_tra+chi_sim`. The official image contains
English and orientation models but omits the two Chinese models. On the first
start the nonroot bootstrap downloads those data files from a fixed official
`tesseract-ocr/tessdata_fast` commit, checks their SHA-256, and atomically stores
them in the private retained volume. Later starts verify and reuse them.
The image's native Tesseract config files are retained by links. Startup fails
closed if a model cannot be verified; no apt/root install is attempted.
First start therefore needs HTTPS access to the official model download host.
Tika and Gotenberg are optional future extensions and are not included.

## Mobile API

In the upstream Web UI, open **My Profile** and generate/copy the API token.
Keep that token private and revoke/regenerate it in Paperless when needed.
Use the package HTTPS base URL and `Authorization: Token <token>` for native
API access. Provider-only OIDC preserves the native token header without a DSM
cookie; protected `/api` resources return 401 when neither a Paperless session
nor a token is supplied. Local browser login/signup remain disabled; new Web UI
sessions redirect through the DSM issuer. Native sessions/tokens remain valid
independently of DSM logout/deletion; see [account limitations](docs/framework-gaps.md).
Physical mobile clients are unverified.

## Build and tests

Released dependency pins remain CLI/templates/SDK/App 0.22.0, executor/v0.20.0, and the
corresponding templates UI 0.12.5. The app serves upstream Angular UI; it adds
no Vue UI dependency. See `toolchain.json` and `package-lock.json`.

```sh
cd synology
npm ci --ignore-scripts
npm test

```

Build with the released CLI/templates/SDK/App 0.22.0 dependencies. No source overrides are required. Run all checks and builds on Linux.

The production build command deliberately rejects source overrides.
Use `python3 synology/scripts/build.py` with `SPL_BUILD_SSH`,
`SPL_BUILDER_IMAGE`, and an isolated `SPL_BUILD_DIR`. The Linux tool image needs
Node 24, the CLI's required Go toolchain, Python 3 and Git, plus access to the
private published Go modules through its normal credential helper. Configure
optional CA mounts in the builder, without committing credentials or hostnames.
`SYNOPKGLAND_COMPOSE_REGISTRY_MIRRORS` may select explicitly trusted HTTPS
metadata transport; output image references remain the official repositories.
To upgrade, commit the current integration and run `python3 synology/scripts/upgrade.py vX.Y.Z`. A new upstream version resets the build to 0001; the same version increases it. The command performs no push, release, catalog change or NAS deployment.

Read [validation](docs/validation.md) for the actual verified boundary and
[e2e](docs/e2e.md) for device acceptance. Valid manifests and successful builds
are not proof of writable storage, OCR, SSO, lifecycle or cleanup.

## Official package icon

The DSM package uses the official project artwork, preserved unchanged and only resized/rasterized to the required icon sizes. See [assets/icon-source.json](assets/icon-source.json) for the source revision and original SHA-256, and [NOTICE](NOTICE) for attribution and the applicable image license. The package ID remains `SynoPkgPaperlessNgx` for upgrade continuity.
