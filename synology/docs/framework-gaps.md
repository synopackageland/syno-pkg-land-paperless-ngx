# Framework boundaries

These are requirements left for the SDK or for a separately scoped upstream
account adapter. They must not be bypassed by a package-owned root hook.

1. **Package-directory bind data:** SDK 0.21.0 rejects private package bind data
   during a DSM build (`COMPOSE_PRIVATE_BIND_TIMING_UNSUPPORTED`). DSM's worker
   acquires the project before postinst, while pkgvar may not exist in preinst.
   This candidate uses supported package-namespaced named volumes. It does not
   claim the requested package-directory data layout.
2. **Shared consume/export folders:** the current Compose contract accepts
   `admin-after-install` or draft intent, not a working `select: install` picker.
   Activation is blocked pending protected ACL and project-control support
   (`COMPOSE_PROJECT_CONTROL_UNAVAILABLE`). No automatic broad filesystem grant
   or root-mounted shared folder is included.
3. **Mobile API:** native Paperless API tokens are supported upstream, but
   `/api` remains protected by DSM admission here. Optional passthrough needs a
   supported Compose administrator control surface and a verified endpoint
   inventory that excludes native password/token login. No permanent bypass is
   declared. Token-only mobile access is unavailable.
4. **Account deletion:** deleting an upstream Paperless user can set document
   owners to NULL and change visibility. No automatic delete adapter is shipped.
   DSM denial does not revoke a native Paperless token or erase documents.
   A safe native account-disable/token-revoke/ownership policy needs its own
   contract and tests. App data remains retained.
5. **Uninstall data:** SDK named volumes are retained on both keep and
   delete-data. The latter cannot honestly promise PostgreSQL/media deletion.
   No root volume purge hook is installed.
6. **DSM YAML argv types:** the native worker's generated admin Compose model
   interpreted a numeric Redis command argument as a number and rejected it
   (`services.broker.command.2 must be a string`). Redis is configured through
   its native config-file interface instead. CLI check/build/inspect alone did
   not detect this DSM compatibility failure.
7. **Registry diagnosis:** SDK direct registry preflight can report denial even
   when Container Manager successfully downloads the same official digest using
   its existing registry transport configuration. Treat preflight diagnosis as
   advisory; record the native worker's actual result separately.

The package supplies no ctl API, Tika or Gotenberg. It makes no claim of
cross-user filesystem ACL inheritance, immediate revocation of upstream native
sessions, or mobile-client acceptance.
