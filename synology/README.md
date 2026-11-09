# Paperless-ngx for DSM

## 3.4.0-0010: personal-token document control

Adds 25 bounded native HTTP commands for documents, classification, notes and
import tracking. Read the [token setup guide](docs/ctl.md) and
[coverage plan](docs/ctl-plan.md). Published CLI 0.52.5 provides bounded multipart
upload and original download through SDK 0.53.22 metadata. Writes require a
redacted dry-run plan and explicit confirmation. Official 3.4.0 images, OIDC
and app-privilege admission are retained.

## Runtime

Three official images run as the package UID/GID with all capabilities dropped
and no-new-privileges. The SDK starts and supervises the project through DSM
Container Manager. The Paperless container retains the official rootless `/init`
entrypoint, migrations, consumer, task queue, scheduler and web server.

PostgreSQL and Redis use private Unix sockets on a package-namespaced named
volume. Both TCP listeners are disabled. Paperless has explicit host networking
because the SDK's OIDC issuer is NAS loopback; its only HTTP listener is forced
to `127.0.0.1:28992`. DSM serves the fixed App path over its own HTTPS listener; the OIDC issuer
uses loopback port 28991 by default. No app-owned root helper or Docker socket is installed.

The named volume stores `paperless/{data,media,export,tessdata}`, the
Django signing key, PostgreSQL data, Redis data and private sockets under
`/var/tmp` inside the containers. All services use the same package identity.
Containers do not inherit a signed-in user's DSM filesystem ACL. Back up the
entire volume with the package stopped, including PostgreSQL and media together.

Private named volumes plus `storage_init` are the supported platform model.
At installation, select an existing local NAS folder for **consume**, including
subfolders at any depth. DSM 7.2.2 and newer use the native folder chooser;
older supported DSM versions use a share dropdown and relative subfolder field.
DSM grants package-account **Read/Write** permission to the entire selected share;
selecting a subtree does not narrow that share grant. The nonroot container mounts
only the selected folder at `/consume`. The native consumer polls every five
seconds, then removes imported files, so use a dedicated inbox and keep backups.
Export remains in the private volume. Missing package-account folder access does
not fail installation: startup shows the SDK permission Dialog and Retry action.

The intended upgrade contract retains the saved share, treating an absent subpath
as the share root. CLI 0.52.14 currently clears the legacy share in the rendered
upgrade wizard. The regression test in `tests/folder-picker.test.mjs` reproduces
this upstream blocker; this candidate must not be merged until a published CLI
preserves the old selection. No App-specific migration or ACL workaround is used.

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

In the upstream Web UI, open the dashboard user menu → **My Profile** →
**Edit Profile** modal → **API Auth Token** → **Copy**. Reuse an existing token.
If none exists, create it intentionally in this modal. Regenerating invalidates
other clients. No automatic token generation or refresh is performed.
See [native token setup](docs/ctl.md).

Use the package HTTPS base URL and native token authorization. Only the six API prefixes listed in
`identity_gateway.upstream_auth_paths` delegate authentication to Paperless; native tokens remain independent of DSM
logout/deletion. Local browser login/signup stay disabled, with OIDC admission
unchanged. Physical mobile clients are unverified.

## Build and tests

Published pins are CLI 0.52.14, templates 0.41.3 and SDK/App 0.53.22.
The upstream Angular UI is retained; UI 0.23.6 is recorded in `toolchain.json`
without adding an unused Vue bundle. See `package-lock.json`.

```sh
cd synology
npm ci --ignore-scripts
npm test
npm run test:ctl
node scripts/render.mjs --check
npx --no synopkgland ctl generate --check
npx --no synopkgland check --json
npx --no synopkgland build --arch x86_64 --json
npx --no synopkgland inspect dist/SynoPkgPaperlessNgx-3.4.0-0010-x86_64.spk --json
```

Release builds use published dependencies and reject source overrides. Run
checks and builds on Linux. Device evidence must identify the installed artifact;
older-build results do not validate this release.

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

Current release checks and acceptance boundaries: [shared-folder release](shared-folder-release.json).
