# Control Paperless with your native API token

Requires a matching SDK v3 package and CLI release with native HTTP support.
This development candidate is not publishable. Upload/download also require
the CLI native file-flow module. See [coverage and dependencies](ctl-plan.md).

Open `/synopkgland/SynoPkgPaperlessNgx/dashboard` on the registered DSM origin,
sign in through the existing DSM entry, then open the user menu → **My Profile**
→ **Edit Profile** modal → **API Auth Token** → **Copy**.
There is no separate profile route or direct modal URL in Paperless 3.4.0.
Use your existing token. If none exists, deliberately create it in that modal.
**Regenerating the token invalidates your other clients.** The CLI never calls
`generate_auth_token`, automates password login, changes env/OIDC or enables
RemoteUser. Do not regenerate as a refresh step.

Run enrollment yourself in your terminal:

```sh
synopkgland ctl auth --host <profile> --app SynoPkgPaperlessNgx
```

The CLI displays the dashboard URL on that profile's canonical origin and UI
instructions, hides token input, verifies `GET /api/profile/` and shows only
first/last name and email. Profile has no stable native ID or OIDC subject proof;
check that it is the intended native account. Do not paste a token into chat,
command arguments, registry, logs or a command input JSON file. Keep it in the
client's OS keychain or explicitly selected encrypted fallback. Credentials are
scoped to the DSM profile, origin, DSM account, package and auth contract; a 403
never switches to an administrator or another profile.

Discover and approve installed metadata with normal CLI instructions, then:

```sh
synopkgland ctl paperless documents list --host <profile>
synopkgland ctl paperless documents search --query invoice --host <profile>
synopkgland ctl paperless documents get --id 42 --host <profile>
synopkgland ctl paperless documents update --id 42 --title Invoice --dry-run --host <profile>
synopkgland ctl paperless documents update --id 42 --title Invoice --yes --host <profile>
synopkgland ctl paperless documents get --id 42 --host <profile>
```

Use IDs visible to your native account. Writes require authorization, a reviewed
`--dry-run`, explicit `--yes`, then readback. Create classification objects with
`tags create`, `correspondents create` or `document-types create`, then use the
returned ID with the corresponding `get`. Notes use `notes add --id ID --note TEXT`
and `notes delete --id ID --note-id NOTE_ID`, followed by `notes list --id ID`.
For sensitive text prefer a private input file or terminal input rather than
shell history. See [generated commands](../generated/operations.md).

With a CLI including file flows:

```sh
synopkgland ctl paperless documents upload --file invoice.pdf --dry-run --host <profile>
synopkgland ctl paperless documents upload --file invoice.pdf --yes --host <profile>
synopkgland ctl paperless tasks get --task-id <receipt-task-uuid> --host <profile>
synopkgland ctl paperless documents get --id <related-document-id> --host <profile>
synopkgland ctl paperless documents download --id <related-document-id> --output original.pdf --host <profile>
```

The receipt task UUID records acceptance. Inspect native task status and related
document IDs until completion; CLI cancellation does not cancel OCR. Download
writes a new local file and reports bytes/SHA-256 only after completion. A browser
URL without a token still requires a native browser session. If a mutation loses
its reply, its outcome may be unknown: inspect native state before retrying.

Official ctl retains DSM metadata/entry admission. Other HTTP clients with a raw
native token use Paperless's native API permission checks independently of DSM
logout, disable or privilege revocation. Local reset/removal does not revoke the
upstream token. Intentional rotation in Paperless revokes other clients too.
