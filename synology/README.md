# Paperless-ngx for DSM

This fork keeps the upstream source and UI unchanged. DSM integration lives only
in `synology/`. Version `3.3.3-0002` references the official Paperless-ngx 3.3.3
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

The named volume stores `paperless/{data,media,consume,export,tessdata}`, the
Django signing key, PostgreSQL data, Redis data and private sockets under
`/var/tmp` inside the containers. All services use the same package identity.
Containers do not inherit a signed-in user's DSM filesystem ACL. Back up the
entire volume with the package stopped, including PostgreSQL and media together.

Package-directory bind data and existing DSM shared-folder selection remain
SDK blockers. This candidate uses the supported named-volume route; it does not
claim to satisfy the requested package-directory or install-time shared-folder
layout. See [framework gaps](docs/framework-gaps.md).

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
`entry: app-privilege` plus gateway `access: dsm-users`; an administrator grants
ordinary users access through DSM Application Privileges. Roles and native login
are covered in the validation record.
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
This package currently keeps `/api` behind DSM admission. A native mobile app
that supplies only a Paperless token will not receive a DSM gateway session,
so token-only mobile access is **not enabled** in this candidate.

The SDK has fixed optional passthrough routes, but a Compose consumer currently
has no verified administrator settings surface for turning them on. No broad
permanent `/api` bypass is added: it would also expose native password/token
login endpoints, and DSM logout/deletion would not revoke those app tokens.

## Build and tests

Pinned released tools: CLI/templates/SDK/App 0.21.0, executor/v0.20.0, and the
corresponding templates UI 0.12.5. The app serves upstream Angular UI; it adds
no Vue UI dependency. See `toolchain.json` and `package-lock.json`.

```sh
cd synology
npm ci --ignore-scripts
npm test
npm run check
```

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
