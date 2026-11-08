# Release notes

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
