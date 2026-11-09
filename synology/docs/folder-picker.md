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

## Upgrade behavior

Published CLI 0.52.15 and SDK 0.53.23 retain legacy share-only selections. An absent
`shared_folder_paths` value means the share root; existing subfolder selections
retain their relative path. Both the upgrade wizard and silent upgrade use this
contract without an App migration, new permission or forced re-selection.

The regression tests cover legacy records in the standard and native wizards,
existing two-level paths and the older DSM fallback. The native chooser's heading
and introduction follow the Package Center language.

Build and inspection compare the unchanged official 0010 SPK with the candidate.
The package continues to run as its own account, with no root helper or additional
container capabilities. Validation results are recorded in
`folder-picker-validation.json`.
