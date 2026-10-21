# Validation record

Candidate `3.3.3-0002`; packaging is reviewable, with framework limitations listed
in [framework-gaps.md](framework-gaps.md). No Release or catalog publication.

## Provenance and local checks

- Source release v3.3.3, commit `31caf01ae54db185fd29190a9ab73105a4b1ee90`.
  The release tag is already an ancestor of the fork's development-history base.
  No upstream file was changed by this integration.
- CLI/templates/SDK/App 0.21.0; executor/v0.20.0; templates UI 0.12.5.
- Official Paperless index
  `sha256:dba0242c1df1843643df4eb50ce5639f3a7900f414879088fd5bed8eaf2d456d`.
  Official Docker Hub and GHCR indexes agree. Built image config labels match
  the exact release/version/source commit. `build-proof.json` records all three
  official image references, platform config hashes and the SPK SHA-256.
- Published CLI check/build/inspect passed for build 0002.
- Linux focused gate: five bootstrap tests and three contract tests passed,
  render freshness passed, Python compilation passed. The negative bridge/OIDC
  control fails with `COMPOSE_OIDC_TOPOLOGY_UNSUPPORTED` as expected.
- Public integration files and commit content are scanned before commit/push;
  credentials, raw device logs, browser profiles and screenshots remain private.

## Device behavior

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
| Consume | A distinct raster PDF written into the declared private consume directory is automatically queued, OCR-completed, searchable and removed from consume after import. |
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
