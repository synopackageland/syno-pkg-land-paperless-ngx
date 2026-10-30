# Paperless-ngx for DSM

## 3.4.0-0002: SDK and installation settings migration (pending)

Pins SDK/App 0.38.2, CLI 0.41.6 and templates 0.35.5 from the public npm
registry. The App serves the unchanged upstream Angular UI and does not use
the SDK UI kit. Upstream image pins remain unchanged.

Installation defaults to the dedicated `SynoPkgPaperlessNgx` read/write share.
DSM creates the share and grants the package account access. The wizard also
offers validated existing shares. Installer-selected gateway/OIDC ports use
SDK-managed settings; Paperless's OIDC provider reads the selected issuer port.
The internal Paperless listener remains on loopback.

`npm run e2e:smoke` uses the CLI's A/N/X helper with the upstream Angular
dashboard header as its ready marker. The full existing E2E suite is retained.

Build and NAS acceptance are pending: CLI 0.41.6 accepts this manifest in
`check`, but its `lockComposeImages` omits `installPorts` when replanning.
SDK 0.38.2 then rejects the runtime issuer-port binding with
`COMPOSE_STORAGE_INIT_INVALID: runtime port must reference install.ports`.
No App-side workaround is included. Older build/validation records below
describe their original versions, not this candidate.


## 3.3.3-0011: SDK entry-gate migration

Built with SDK/App/templates 0.32.0, CLI 0.34.0 and executor v0.32.0.
Only `/api` use upstream authentication; all other browser paths retain the DSM entry gate.
Protected executor payloads changed: administrator approval is required again after upgrading.
No NAS installation or device acceptance was performed for this rebuild.

## 3.3.3-0008

Improve opening the App from the DSM menu and external access settings. Built with SDK/App 0.30.2 and CLI/templates 0.30.0. No NAS testing was performed for this toolchain rebuild.

改善從 DSM 選單開啟 App 與外網存取設定；使用 SDK/App 0.30.2 和 CLI/templates 0.30.0 重建

This fork keeps the upstream source and UI unchanged. DSM integration lives only
in `synology/`. Version `3.3.3-0008` references the official Paperless-ngx 3.3.3
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
At installation, accept the dedicated **SynoPkgPaperlessNgx** Shared Folder for
**consume**. DSM creates it with package-account **Read/Write** permission.
An optional existing folder must already grant the required package access;
the install wizard validates it before continuing.
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
`upstream_auth_paths: [/api]`; an administrator grants
ordinary users access through DSM Application Privileges. Roles and native login
are covered in the validation record. Only `/api` delegates authentication to
Paperless; browser routes and OIDC issuance require DSM admission. Paperless
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
API access. The `/api` exception preserves the native token header without a DSM
cookie; protected `/api` resources return 401 when neither a Paperless session
nor a token is supplied. Local browser login/signup remain disabled; new Web UI
sessions redirect through the DSM issuer. Native sessions/tokens remain valid
independently of DSM logout/deletion; see [account limitations](docs/framework-gaps.md).
Physical mobile clients are unverified.

## Build and tests

Dependency pins are CLI 0.41.6, templates 0.35.5 and SDK/App 0.38.2.
The app serves upstream Angular UI; it adds no Vue UI dependency.
See `toolchain.json` and `package-lock.json`.

```sh
cd synology
npm ci --ignore-scripts
npm test

```

Build with the pinned released dependencies. No source overrides are used.
Run all checks and builds on Linux. The CLI build blocker above must be fixed
before this candidate can be installed or accepted.

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
