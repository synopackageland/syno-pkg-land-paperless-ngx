# Framework boundaries

Private named volumes plus `storage_init` are the supported platform storage
model, not a framework gap. The package uses that model for PostgreSQL, Redis,
media, export and OCR models. Consume is the one install-selected read/write
Shared Folder; the native wizard currently supports one folder, so export stays
private. Shared Folder selection and ACL grants are separate operations.

## Account deletion and revocation

Do not delete the Paperless user when a DSM user disappears: document ownership
can become NULL and change visibility. Upstream v3.3.3 exposes
`PATCH /api/users/{id}/` with `is_active: false` (`src/paperless/serialisers.py`,
`UserSerializer`, and `src/paperless/views.py`, `UserViewSet`). That alone is not
a complete token/session deletion adapter.

The native `GenerateAuthTokenView` only regenerates the **requesting** user's
API token and requires that user's authenticated session. The release URL
registry (`src/paperless/urls.py`) has no administrator API to delete a selected
user's tokens or sessions, nor an API mapping the verified OIDC social `sub`
to a user for the account bridge. The existing SDK bridge supplies DSM UID/name
and executes a nonroot command; it cannot safely turn a username guess into
that mapping. No complete safe native deactivate + token/session revoke method
was found, so no partial automatic adapter is shipped. There are no direct DB
writes, password changes, Docker-socket or root hooks to emulate one.

Provider-only OIDC checks DSM App privileges when issuing a new login. It does
not revoke existing native Paperless sessions/API tokens when a DSM user is
denied or deleted. Administrators must separately manage native access until a
supported account adapter exists. Document owners and retained data stay intact.

## Uninstall data

SDK named volumes are retained on both keep and delete-data. Delete-data cannot
promise PostgreSQL/media deletion. The selected consume Shared Folder and its
administrator-managed ACL are also retained. No root volume purge is installed.

## Device compatibility observations

- Numeric native worker argv values must remain strings. Redis uses its native
  configuration file and health checks use fixed CMD-SHELL, avoiding the DSM
  worker's numeric-argument parsing failure.
- Registry preflight diagnosis can differ from Container Manager's actual
  download result. Record the native worker result separately.

The package supplies no ctl API, Tika or Gotenberg. ARM, reboot recovery, trusted
first-open TLS, two-user document isolation and physical mobile clients remain
unverified. HTTP token API acceptance does not establish mobile App acceptance.
