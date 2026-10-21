# Device acceptance

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
