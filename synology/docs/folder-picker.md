# Install folder selection

| Key | Previous selection | New selection | Container path | Access | Purpose |
| --- | --- | --- | --- | --- | --- |
| consume | Dedicated share, optionally an existing share root | Existing local share root or child folder | `/consume` on webserver | Read/write | Poll and import documents, then remove consumed originals |
| state | Private named volume | Private named volume | `/var/tmp` on webserver, db and broker | Read/write | Database, media, export, OCR models and private sockets |

The published CLI owns the folder chooser, fallback fields, saved configuration,
DSM data-share request and permission Dialog. The App declares `picker: folder`
on both `install.sharedFolder` and `compose.shares.consume`. The only submitted
answers are `consume` (share name) and `consume_subpath` (relative folder path).
An empty subpath selects the share root. All services use the package UID.

DSM grants read/write on the whole share even when only a subtree is mounted.
The folder must already exist. No App code creates it, writes ACLs or takes root.

## Published toolchain blockers

CLI 0.52.14's generated upgrade wizard accepts a saved record only when it already
has `shared_folder_paths`. Official 0010 writes only `shared_folders`, so the new
wizard clears the recorded share. `tests/folder-picker.test.mjs` has a failing
regression for that legacy record and a passing regression for a two-level path.
Do not merge until a published CLI preserves legacy selections without re-picking.

CLI 0.52.14 also rejects the unmodified official 0010 SPK's wizard during baseline
inspection (`APPROVAL_BASELINE_INVALID`, underlying `COMPOSE_ARTIFACT_INVALID`).
The required baseline gate remains blocked; a direct privilege comparison is
supporting evidence only. Neither defect is patched in this App.

The native DSM 7.3.2 upgrade wizard also reproduces the cleared legacy selection.
A fresh device install selected a folder two levels deep and verified read/write
as the package UID; all three containers retained their nonroot identity.

A silent official-0010 to candidate-0011 upgrade with all selection parameters
omitted also fails: incoming preinst exits 1 with `COMPOSE_SHARE_INVALID`,
"folder selection missing; select a folder in the upgrade wizard". DSM has
already removed the old payload at that point; the legacy configuration and
private data remain. This is a release blocker, not only a wizard inconvenience.
