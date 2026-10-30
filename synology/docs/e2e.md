# Device acceptance

## Minimal App-open smoke

Set private mode-600 `DSM_E2E_ACCOUNT_ADMIN` and `DSM_E2E_ACCOUNT_NORMAL` files
containing `{username,password}`, a private `DSM_E2E_PROFILE_DIR`, an ignored
`DSM_E2E_OUTPUT_DIR`, and `DSM_E2E_URL` for the caller's authorized NAS tunnel.
Grant the normal account this App's Application Privilege before running.

CLI 0.41.9 accepts self-signed DSM and gateway certificates for A/N/X.
Set the reachable DSM HTTPS URL privately; no App-side certificate bypass is
required. The script uses `DSM_E2E_URL` directly and never opens another tunnel.

```sh
cd synology
npm run e2e:smoke
```

If connectivity requires SSH forwarding, forward both the NAS's actual DSM
HTTPS port and its selected gateway HTTPS port. Preserve those port numbers on
an isolated loopback hostname: native OIDC redirects use the NAS's DSM port.
Point `DSM_E2E_URL` at that HTTPS origin, and close the caller-owned tunnel when
the run finishes. A random local DSM port alone does not cover those redirects.
Keep the smoke test and CLI helper unchanged.

The CLI helper checks administrator (A), permitted normal user (N), and a fresh
signed-out context (X). The ready marker is the upstream Angular dashboard's
`pngx-dashboard pngx-page-header`. A skipped N is incomplete acceptance.
The smoke does not install packages or change privileges. Run against the final
installed SPK; test discovery alone is not device acceptance.

The full suite below is retained independently.

The suite uses released `e2e` and the CLI's DSM login/session helpers. It reuses
mode-600 profiles, checks the live DSM session, and opens the actual DSM menu.
Credentials, session profiles and outputs must stay outside public Git history.

Set `DSM_E2E_URL`, `DSM_E2E_ACCOUNT_ADMIN`, `DSM_E2E_ACCOUNT_MEMBER`,
`DSM_E2E_PROFILE_DIR` and an ignored `DSM_E2E_OUTPUT_DIR` under `synology/.e2e/`.
Account files contain `{username,password}`. The profile directory must be
outside the checkout. Set `PAPERLESS_E2E_PDF` to a scanned PDF and
`PAPERLESS_E2E_SEARCH` to text expected from OCR. Public tests contain no NAS
address, fixture account name or credential.

```sh
cd synology
npm run e2e:nas
```

`PAPERLESS_E2E_TRUST_CERTIFICATE=1` opts into test-only certificate acceptance
inside disposable browser contexts. It neither installs a certificate nor
changes DSM settings. Such a run cannot prove trusted first-open TLS.
`PAPERLESS_E2E_ALLOW_PRIVILEGE_FIXTURE=1` enables a scoped test that snapshots,
changes and restores only this package's App rule for the configured disposable
member. It creates fresh browser contexts from DSM cookies and exercises allowed
login and explicit denial, then verifies exact rule restoration. It changes no
account membership or other application rule.

The acceptance record must include: clean install; native menu OIDC with no
second password; logout and reopening; administrator and ordinary subject/role
mapping; rejected App admission; scanned PDF upload, completed OCR, search and
download; consume-directory import; stop/start; upgrade build 0001 to 0002 with
data preserved; uninstall keep/reinstall; delete-data's actual retained volumes;
and final fixture cleanup/readback. `PAPERLESS_E2E_DELETE_FIXTURE=1` enables
the final destructive uninstall scenario for this package only. The caller must
separately read back package paths, processes and retained volume names; an API
success response alone is insufficient. Missing scenarios remain unverified.

A typed command, an install success response, a screenshot, or a queued OCR task
is not proof that the complete workflow passed. Archive raw screenshots and
reports privately; public validation includes only sanitized results and hashes.

## Provider-only candidate acceptance

Install build 0003 through the native DSM wizard, select a dedicated consume
Shared Folder, and grant only the package account Read/Write using **System
internal user** permissions. Read back the saved share name, container bind and
kernel writability before copying a distinct raster PDF into that host folder.
`PAPERLESS_E2E_CONTROL` must implement `consume` by copying to the selected share,
not by writing into a private container volume. Keep the fixture private.

`16-native-api.e2e.ts` obtains a native token through the logged-in profile API
and checks independent no-cookie requests: token 200, missing/invalid token 401.
Only status results are persisted. A fresh browser must traverse the native OIDC
login and reserved SSO routes with no local password form. The App-privilege
suite checks a fresh identity's **issuer** denial and restores the exact rule.
This does not assert that existing native sessions/tokens are revoked.
Use the DSM's actual configured HTTPS port in the tunnel: the OIDC issuer
redirects to that port. A different local DSM port does not redefine the issuer.
Development source commits and nonpublication status belong in every report.
