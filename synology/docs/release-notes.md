# Release notes

## 3.4.0-0010: native-token ctl development candidate

Adds bounded native HTTP v3 commands for documents, tags, correspondents,
document types, notes and original task UUID tracking. Writes are human-only,
with dry-run plans, explicit confirmation and readback. Original upload/download
require matching CLI file flows. See [setup](ctl.md) and [coverage](ctl-plan.md).

Copy the existing API token from dashboard → My Profile → Edit Profile modal →
API Auth Token. Regenerating invalidates other clients; the CLI never generates
or regenerates a token. Native resource permissions and token revocation remain
upstream behavior, independent of DSM logout or local credential removal.

Official images, OIDC, app-privilege and published SDK/CLI pins are retained.
Matching native HTTP SDK/CLI artifacts are not released yet. This candidate is
marked non-publishable and is locally verified with source overrides only.
No NAS verification, merge, publish or release is performed by this change.
Final artifact and retained-upgrade acceptance belong to integration.
