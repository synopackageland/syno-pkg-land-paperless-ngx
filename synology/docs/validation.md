# Validation record: 3.4.0-0012

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

Validation: 5 bootstrap tests and 12 packaging contract tests, renderer freshness,
check, build, inspect comparison with 3.4.0-0011 and leak scans. Device: upgraded
from 3.4.0-0011 on an x86_64 DSM 7.3 NAS; all three containers started healthy
with no tmpfs mounted. Every scratch path was a btrfs bind owned by the package
UID; the SDK sets 0700 and s6-overlay then sets `/run` to 0755 and the PostgreSQL
entrypoint sets `/run/postgresql` to 3775, as they did on tmpfs. PostgreSQL's
socket and lock file worked from disk, and the main page loaded through DSM sign-in.

# Validation record: 3.4.0-0010 (historical)

Release-ready with published dependencies and device acceptance of the exact
x86_64 artifact. [Machine-readable evidence](../ctl-validation.json) records
versions, npm integrity, the Go module sum, image references and SPK SHA-256.

## Local evidence

- Published CLI 0.52.5, templates 0.41.3 and SDK/App 0.53.4; UI 0.23.6 is
  recorded without adding an SDK UI bundle to the upstream Angular application
- 5 bootstrap tests, 6 packaging contract tests and 11 native ctl tests pass
- Renderer and descriptor freshness pass; check has no warnings and inspect
  has no findings; all 144 source/UI inventory surfaces are accounted for
- The official Paperless 3.4.0 image matches upstream source revision
  `ced3cf9303e08648e6fa80d35b9307d97e32cfd1`; upstream files remain unchanged
- The published file-flow callback verifies multipart bytes and task UUID,
  exact original download bytes/SHA-256 and refusal to overwrite a destination
- No source override is used; the build script includes ctl and freshness gates

## Device acceptance

One x86_64 DSM 7.3.2 device ran the 0009 → 0010 upgrade. Two independent,
nonstaff, nonsuperuser native fixture accounts uploaded their own documents
before upgrading. Their document owners and original bytes/SHA-256 survived.

The official ctl client exercised all 25 commands through real DSM metadata
admission and native HTTP, using two distinct personal fixture tokens and
separate local profiles. Cross-account document reads were refused. Removing
one fixture account's create-tag permission produced a native 403 with exactly
one request, no credential fallback and a subsequent successful own-document
read using the same credential.

The release upload returned its native UUID, reached native `success` and
resolved to the expected owner/document. Original download matched 21097 bytes
and SHA-256 `91c5d222b286989721aaf00c2a525e44a9b0a44f696cf11d3b11a46bf307bd4c`.
Upload/download dry-runs performed no native IO or secret reads. Missing write
confirmation was refused. A confirmed document update was read back, as were
classification and note operations. The OIDC administrator dashboard opened;
an anonymous browser remained outside the application.

The fixture secret backend was isolated in memory. This validates ctl execution,
metadata admission and file transfer, without claiming user-operated OS keychain
enrollment UX. Existing users' tokens were not generated or rotated.

## Cleanup and boundaries

Three fixture documents, including their trash entries, three classification
objects and both native fixture accounts were removed. Both personal tokens
were verified revoked. The three completed native task records were explicitly
acknowledged; the upstream API has no task deletion route and owns their history
retention. Existing application objects and DSM accounts were preserved.

The baseline SPK was supplied for comparison. CLI reports executor approval
retention unknown because there is no matching executor inventory; this package
requests no root executor. The narrower gateway policy changes the native auth
contract digest, so existing local personal-token enrollments require enrollment
again. No merge, tag, publication or catalog update is part of this validation.
