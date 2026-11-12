# Release notes

## 3.4.0-0013: installation reliability

Rebuilt with CLI 0.53.16. The ingress, gateway and Portal nginx reload is now
declared only for package start and stop: INFO keeps
`startstop_restart_services="nginx.service"` and no longer sets
`instuninst_restart_services`. The install-time reload could collide with DSM
`API.Info` and make Package Center show a `t.indexOf` error after installing.
SDK, App runtime, upstream version and image are unchanged.

This rebuild runs check, build, inspect comparison with 3.4.0-0012 and privacy
scans; unit, browser, container-runtime and device acceptance tests were not run.

Offline comparison with 3.4.0-0012: the only INFO change besides version and
changelog is the removed `instuninst_restart_services`. Root programs and policy
changes are empty and the payload differs only in the versioned UI host script.
Approval retention reports `unknown`, as it did for 3.4.0-0012: the CLI cannot
match a baseline and executor inventory for this package.

## 3.4.0-0012: temporary files on disk

Every Compose tmpfs moves to SDK disk scratch: a package-UID-owned mode-0700
directory per path on the package volume, emptied at every container start.
Paperless uses scratch for `/run` (s6-overlay runtime, which must be writable and
executable), `/tmp` (with `TMPDIR=/tmp`) and the image's unused
`/usr/src/paperless/{data,media,consume,export}` placeholders. PostgreSQL uses it
for `/tmp`, its secondary socket directory `/run/postgresql` (the image links
`/var/run` to `/run`; scratch refuses symlinked targets) and
`/var/lib/postgresql`; Redis for `/tmp`. Unix sockets and lock files work on disk
(the primary sockets were already on the named volume), so no memory tmpfs remains.
Published pins are CLI 0.52.16, templates 0.41.3 and SDK/App 0.53.25 (executor
0.53.6). Official images and upstream source are unchanged.

## 3.4.0-0010: personal-token document control

Adds 25 bounded native HTTP commands for document discovery and editing,
classification, notes and import task tracking. Original upload returns the
native task UUID; original download reports verified byte count and SHA-256.
Writes require a redacted dry-run plan and explicit confirmation. File transfers
are human-only and retain the 256 MiB limit, without a productive-stream total
deadline, automatic retry, overwrite or fabricated OCR completion.

Use your own existing API token from dashboard → My Profile → Edit Profile →
API Auth Token. Regeneration invalidates other clients. The CLI never generates
or rotates user tokens, substitutes an administrator credential or treats a 403
as an authentication refresh. Native permissions and token revocation remain
upstream behavior, independent of DSM logout or local credential removal.

Pins published CLI 0.52.5, templates 0.41.3 and SDK/App 0.53.4, with UI 0.23.6
recorded in the toolchain. The Compose package retains the official upstream UI,
images, OIDC and app-privilege entry. Native-auth exceptions now name only the
six API areas used by these commands. Existing credentials require re-enrollment
because that narrower gateway policy changes the native auth contract digest.
Document/classification deletion, bulk operations and public share creation
remain outside this release's selected scope.

See [setup](ctl.md), [coverage](ctl-plan.md) and the exact release validation
record in [ctl-validation.json](../ctl-validation.json).
