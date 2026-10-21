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
