# Validation record: 3.4.0-0010

This native-token ctl candidate has local packaging validation only. It has not
been installed on a NAS. No release or catalog publication is included.
[Machine-readable evidence](../ctl-validation.json) records the artifact hash,
exact development SDK/CLI source revisions, upstream image references and checks.

## Local evidence

- Official Paperless 3.4.0 image and upstream source revision match
  `ced3cf9303e08648e6fa80d35b9307d97e32cfd1`. The upstream source/UI, Compose image
  pins, bootstrap, native OIDC and entry policy are unchanged.
- 5 Python bootstrap tests, 6 packaging contract tests and 10 native ctl tests
  pass. Coverage drift checks account for 144 UI/API surfaces.
- Renderer freshness, v3 generation/check, manifest check and x86_64 build pass.
  SPK inspect returns no findings. Packaged descriptor/inventory match generated
  metadata, and packaged gateway retains OIDC, `app-privilege` and `/api`.
- Native tests exercise the actual matching CLI executor/client with local
  source-shaped fixtures: selected request bindings and readbacks, redacted
  dry-runs, confirmation, bounded pagination/OCR/notes, original task UUID,
  selected profile identity, separate DSM profiles, entry denial and non-replay.
  These fixtures are not live native permission or browser acceptance.
- Published dependency pins remain unchanged. Local validation uses matching
  merged SDK/CLI sources with overrides. The candidate is non-publishable until
  matching versions are actually released and selected.

## Blocked and pending

- Real multipart upload and original download need CLI file-flow integration;
  declarations are present and fail closed without that module.
- Native empty-204 document/classification DELETE cannot currently satisfy the
  CLI MIME contract. A regression fixture confirms rejection; those mutations
  are not exposed. Notes DELETE returns 200 JSON and is covered locally.
- Final merged-artifact verification must cover real profile modal/token UI,
  native identity/permission isolation, original upload/task/OCR/download and
  SHA-256/MIME, mutation readbacks, interrupted transfer and retained upgrade.
- No final lifecycle, rootless runtime, storage, reboot, browser, object-isolation
  or retained-upgrade result is claimed for this candidate. Older acceptance
  remains in Git history and applies only to its original artifacts.
- No baseline SPK was supplied to this development build; approval retention is
  reported unknown. Resolve the final published artifact's approval comparison
  during integration/release validation.

See [ctl plan](ctl-plan.md) for command-level scope and exclusions, and
[token setup](ctl.md) for the user-operated enrollment flow. Do not regenerate
an existing token as a test or refresh step: that invalidates other clients.
