# Validation record

Development candidate `3.3.3-0003`; packaging is reviewable, with remaining limits listed
in [framework-gaps.md](framework-gaps.md). No Release or catalog publication.

## Provenance and local checks

- Source release v3.3.3, commit `31caf01ae54db185fd29190a9ab73105a4b1ee90`.
  The release tag is already an ancestor of the fork's development-history base.
  No upstream file was changed by this integration.
- Released dependency pins remain CLI/templates/SDK/App 0.21.0 and templates UI
  0.12.5. Build 0003 uses authorized **development source overrides**: SDK main
  `fcbbf485ee5cd6565ce9ab491cd8b19a6ca34075`, CLI main
  `7ef4fcea441f5ff5057196b40f607298f2b47d4b`, and published templates 0.21.0.
  This artifact is not publishable. Released executor/v0.20.0 describes the
  baseline only; source override builds use the snapshot's lifecycle payloads.
  Re-pin all four packages together after a compatible release is announced.
- Official Paperless index
  `sha256:dba0242c1df1843643df4eb50ce5639f3a7900f414879088fd5bed8eaf2d456d`.
  Official Docker Hub and GHCR indexes agree. Built image config labels match
  the exact release/version/source commit. `build-proof.json` records all three
  official image references, platform config hashes and the SPK SHA-256.
- Snapshot CLI check/build/inspect passed for build 0003; inspect has no findings
  and explicitly reports `upstreamProtected: false`, issuer `dsm-users` and
  issuer entry `app-privilege`. Released CLI acceptance applies only to 0002.
- Linux focused gate: five bootstrap tests and four contract tests passed,
  render freshness passed, Python compilation passed. The negative bridge/OIDC
  control fails with `COMPOSE_OIDC_TOPOLOGY_UNSUPPORTED` as expected.
- Public integration files and commit content are scanned before commit/push;
  credentials, raw device logs, browser profiles and screenshots remain private.

## Device behavior

The original lifecycle rows below describe build 0002 unless superseded by the
provider-only acceptance addendum. Build 0003 changes admission and storage;
0002 results are not relabelled as new-candidate tests.

Verified on DSM 7.3.2 with Container Manager 24.0.2, x86_64:

| Scenario | Result and evidence boundary |
| --- | --- |
| Clean install | Native package installation succeeded; all three containers use the package UID/GID. |
| Rootless | Main Paperless process has package UID/GID and zero effective capabilities; SDK plan drops all capabilities for all services. PostgreSQL and Redis rootfs are read-only. Paperless uses its official rootless s6 runtime with executable `/run` tmpfs. |
| Network | Issuer 28991 and Paperless 28992 listen on 127.0.0.1; only native HTTPS gateway 28993 is public. PostgreSQL and Redis have no TCP listeners. |
| Main menu OIDC | Actual DSM menu launch reaches upstream UI with no second password; authenticated profile API returns 200. |
| Identity and roles | Administrator and ordinary account each have native OIDC provider `dsm`, numeric social subject, and no usable local password. SQL readback shows administrator superuser/staff true and ordinary account false. No database writes are used. |
| OCR upload/search | Upload of a raster-only PDF, with independently verified empty text extraction, completes OCR; native search and UI cards find the expected text. |
| Download | Native UI download link returns HTTP 200 `application/pdf`, attachment disposition and a saved file beginning `%PDF-`; separate native API download probe passes. |
| Consume | A distinct raster PDF written into the install-selected rw consume Shared Folder is automatically queued, OCR-completed, searchable and removed from consume after import. |
| OCR models | Runtime with the declared TESSDATA_PREFIX lists English, Traditional Chinese and Simplified Chinese. Both additional official data files match their pinned SHA-256. |
| Stop/start | Native stop/start succeeded and the browser/API retained every baseline document ID and OCR content. |
| Upgrade | A clean native 0001 to 0002 upgrade completed as `action: upgrade`, `success: true`, `installed_and_started`; browser inventory matches the exact baseline. |
| Keep/reinstall | Uninstall followed by reinstall of build 0001 succeeded and retained the same documents/content, then the clean upgrade to 0002 passed again. |
| App privileges | Fresh member browser contexts pass with an explicit native App allow rule, and receive actual HTTP 403 `dsm_app_privilege_denied` with a native deny rule. The exact previous rule is restored and read back. |
| Delete-data uninstall | Native API forwards the wizard delete-data answer; package removal succeeds and package data/config/home contents are empty. All seven named container volumes remain, matching the explicit SDK limitation. |
| Cleanup | Test administrator subsequently removes only this disposable project's labelled, unused volumes and empty package roots. Native package/containers/volumes/listeners are read back absent; shared image caches and machine configuration are retained. This external fixture cleanup is not an App data-deletion feature. |
| Logout/reopen | Native upstream GET logout returns 302; reopening automatically uses DSM OIDC, rotates Paperless session and requires no password. |

Browser functional tests explicitly accepted the fixture's self-signed
certificate in disposable test contexts. They do not prove trusted first-open
TLS, a real mobile client's flow, ARM behavior, reboot recovery or two-user
object-level document isolation.

## Compatibility discoveries

The native DSM worker parsed numeric argv elements as YAML numbers despite CLI
check/build/inspect success. Redis now uses a native config file; the container
health check uses native CMD-SHELL form with a fixed literal command. This is
configuration through supported upstream interfaces, not a source/image patch.

Initial rootless s6 startup required an executable `/run` tmpfs. PostgreSQL's
first-run bootstrap also needed its default Unix socket directory alongside
the private shared socket. Failed disposable database volumes were removed
before the successful clean-install test; no installed-data hotfix was used.

SDK registry preflight reported direct registry denial while native Container
Manager downloaded and ran the same official immutable images successfully.
Preflight messages and actual worker results are recorded separately.

## Provider-only / selected consume acceptance (build 0003)

- Native Package Center wizard visibly selected a dedicated existing consume
  Shared Folder. Saved package config readback matched it. A separate native
  Shared Folder permission change granted only the package account rw; readback
  changed from no explicit grant to writable. Container inspection showed that
  exact host folder bound rw at `/consume`; package UID runtime checks found it
  readable and writable. Selection did not silently grant an ACL.
- Actual DSM menu OIDC reached Paperless without a second password. Raster PDF
  upload, OCR search and native PDF download passed. A second raster PDF copied
  into the selected host share was imported and searchable; both host/container
  views confirmed source removal after import. No private-volume consume write
  was substituted. Runtime SQL readback showed distinct admin/member social
  identities, no usable passwords, admin staff/superuser true and member false.
- Fresh contexts with a temporary native App allow rule could sign in; explicit
  deny returned actual issuer HTTP 403 `dsm_app_privilege_denied` at
  `/_sso/dsm-return`. Previous rules were restored and read back.
- Native API requests with no DSM cookies: valid Paperless token 200, missing
  token 401 and invalid token 401. Fresh browser navigation traversed upstream
  `/accounts/oidc/dsm/login/` and SDK reserved SSO routes; no native password
  login form appeared. The test retains only status evidence, never token bytes.
- Native logout returned 302, reopening used DSM OIDC without a second password
  and rotated the native session. Native stop/start retained exact baseline
  document IDs/content and the saved consume-share selection.
- Native delete-data uninstall also passed for 0003; readback found the package
  absent and all seven named volumes retained. The selected consume share also
  remained, as designed. This is the documented retention limit, not full deletion.
- Final focused OIDC/admission/API/logout run passed all five selected tests
  (including DSM setup). Restart passed separately. The upload/consume scenario
  passed in its earlier scenario run. Broader lifecycle history stays under 0002.
- Acceptance used test-only self-signed certificate trust, an isolated loopback
  hostname and DSM's actual configured HTTPS port. Initial wrong local-port,
  certificate and missing-member-admission fixtures failed and remain in private
  evidence; successful scenario runs are not claimed as a single green batch.

The development SPK is deliberately not released. Named volume retention and
account-revocation limits remain documented in framework-gaps.md; ARM, reboot,
trusted first-open TLS and physical mobile clients were not tested.
