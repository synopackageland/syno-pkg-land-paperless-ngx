# Paperless native-token ctl plan

This release adds 25 v3 native HTTP operations under the `paperless` alias.
Only packaging changes. The official Paperless 3.4.0 image, OIDC setup,
`app-privilege` entry are retained. Native authentication exceptions are limited
to `/api/profile`, `/api/documents`, `/api/tags`, `/api/correspondents`,
`/api/document_types` and `/api/tasks`.
[Source/UI inventory](../ctl-coverage.json) records 144 reviewed surfaces,
including every registered router, inherited decorated action, explicit URL and
Angular route. [Generated reference](../generated/operations.md) is the command
source of truth. Coverage is intentionally incomplete where recorded below.

## Selected operations

| UI action / native API | CLI paths | Effect / AI | Reason and readback |
| --- | --- | --- | --- |
| Documents list / full-text search, GET `/api/documents/` | `documents list`, `documents search` | read / read | Core discovery, native `query`, tag/correspondent/type filters; page/page_size at 25/page, 40 pages and 1000 items maximum |
| Document details, GET `/api/documents/{id}/` | `documents get`, `documents text` | read / read | Metadata projection, separate complete OCR text capped at 8000 characters; full response bytes bounded before projection |
| File metadata, GET `/api/documents/{id}/metadata/` | `documents metadata` | read / read | Bounded native file metadata before original download |
| Document edit, PATCH `/api/documents/{id}/` | `documents update` | write / human-only | One explicit ID; title, tags, correspondent and document type only; `documents get` readback |
| Attributes lists/details/create/edit, `/api/tags/`, `/api/correspondents/`, `/api/document_types/` | `tags`, `correspondents`, `document-types` × `list`, `get`, `create`, `update` | reads / read; writes / human-only | Complete common classification workflow; name and native matching fields, tag color/inbox flag; create returns ID, then matching `get` readback |
| Tasks page, GET `/api/tasks/` | `tasks list`, `tasks get --task-id UUID` | read / read | v10 page envelope; original Celery UUID query, not task resource PK; native status, owner and related_document_ids retained |
| Document notes, `/api/documents/{id}/notes/` | `notes list`, `notes add`, `notes delete` | read, write, destructive respectively; mutations human-only | Explicit document/note IDs; add/delete return current notes and require `notes list` readback |
| Upload button, POST `/api/documents/post_document/` | `documents upload` | write / human-only stream | Direct multipart `document`; no owner override, native uploader owner and JSON task UUID receipt; official CLI file flow |
| Download original, GET `/api/documents/{id}/download/?original=true` | `documents download` | read / human-only stream | Exact original bytes, explicit local output, completion bytes/SHA-256; official CLI file flow |

Every command requires a DSM-authenticated metadata description and the selected
native token's own model/object permissions. There is no administrator fallback,
owner/actor override, database read, Docker exec adapter or business CGI.
The user-selected native account is not proof of DSM identity. Native shared or
ownerless objects retain upstream sharing behavior; nonstaff tasks include own
and unowned system tasks. Staff visibility remains native.

Every selected write/destructive supports `--dry-run` without loading a native
credential, and requires `--yes` before the native request. Plans redact private
title/name/match/note, query and local file/output inputs. A plan describes the
request; it does not simulate upstream changes. Mutations are human-only because
there is no native preview endpoint. Read back the exact ID after success; after
an uncertain mutation inspect state and never automatically replay it.

## Limits and exclusions

- Page collection returns `items` and `incomplete`; at 1000 items, 40 pages or
  16 MiB total it reports a continuation. `next` URLs are never followed. Lists
  are not snapshots. Each response is limited to 1 MiB. Document-list content
  above 8000 characters is rejected rather than silently sliced.
- OCR uses a complete string up to 8000 characters. No offset, trim or invented
  continuation. Metadata get excludes OCR/notes, though the complete native
  response must fit the byte bound before projection.
- Notes have no native pagination. At most 50 notes and **16000 UTF-8 JSON
  response bytes**, including metadata, are accepted. This conservative byte
  cap guarantees total note text cannot exceed 16000 characters and may reject
  smaller multilingual text. No truncation/continuation. Add input is 8000
  characters; an oversized response after a mutation requires manual readback,
  never resending the mutation.
- No batch operations are exposed. Replacing a document's tags accepts at most
  25 explicit tag IDs. Future batch document mutations must use at most 25
  explicit document IDs, without filter expansion. Synchronous bulk edit,
  delete-many and inbox-done remain deferred; no invented async layer.
- Document and classification DELETE remain outside this selected 25-command
  release. CLI 0.52.5 supports explicitly declared empty native acknowledgements;
  the previous MIME blocker is resolved. Adding destructive resource deletion
  still requires a separately reviewed registry and trash/readback workflow.
  Notes DELETE returns JSON 200 and is implemented.
- Inbox list requires tag → document composition absent from the fixed flows.
  Use `tags list` and a known tag ID in `documents list --tags ID` separately.
- Saved views and custom-field CRUD are excluded from this initial workflow;
  complex filters/type conversion need separate review. Native features exist.
- Public share links/bundles need gateway-reachability acceptance. No public
  share creation or token-bearing URL is exposed. A browser file link can be
  constructed as `/synopkgland/SynoPkgPaperlessNgx/api/documents/ID/download/?original=true`;
  it contains no token, requires an existing **native browser session** and is
  not a DSM-only cold download. No file-link operation fabricates this result.
- Original transfer only: PDF, JPEG and PNG upload; download additionally allows
  octet-stream. 256 MiB cap in package, flow and response. No silent archive
  fallback, remote URL input, overwrite, resume or native cancel promise.
  Upload receipt means accepted, not OCR complete. Query the original task UUID,
  then GET the related document and verify owner before original download.

## Remaining UI/API areas

| Category / pages | Coverage decision |
| --- | --- |
| Dashboard, documents, detail, attributes, tasks | Core mapped above; UI widgets/redirects are not separate commands |
| Settings, UI settings, config | Native read/write exists; global settings, AI/mail secrets and behavior changes excluded |
| Diagnostics: logs, status, remote_version, statistics | Native APIs exist; system scope and output limits need separate review |
| Permissions: users, groups, object sharing | Native APIs exist; grant/identity administration excluded; current permissions still enforced upstream |
| Storage paths | Native CRUD exists; filesystem placement and grants excluded |
| Mail accounts/rules/processed mail | Native automation and private credentials excluded |
| Workflows/triggers/actions/webhooks | Native automation exists; independent security review required |
| Saved views, custom fields | Outside initial bounded classification set; no claim of absent capability |
| Trash/restore, versions, rotate/merge/edit/reprocess/password removal | Distinct destructive or asynchronous PDF behavior excluded |
| Selection data, bulk download, bulk edit objects | Composite selection/archives and synchronous long work excluded |
| Global search/autocomplete | Distinct result shapes; documents search uses documents query only |
| Profile, API token/password login, MFA, social disconnect | Enrollment GET profile only; mutation/credential export never business commands |
| Schema/docs, assets, redirects, browser/admin/accounts | Infrastructure/UI paths; no business ctl binding |
| Chat streaming and `/ws/status/` | Non-REST/SSE/WebSocket protocols outside selected v3 fixed flows |

## Verification and dependencies

Focused packaging tests execute these exact bindings through the matching CLI
executor with source-shaped fixtures, schema validation, confirmation guards and
readback. They check page exhaustion, OCR/notes refusal, task UUID, selected
identity projection and mutation non-replay. These fixtures do not prove live
native role isolation or browser behavior.

The package pins published CLI 0.52.5, templates 0.41.3 and SDK/App 0.53.4.
Toolchain metadata records UI 0.23.6; this Compose package uses the upstream UI
and has no SDK UI bundle. Release builds refuse source overrides. The focused
file-flow test invokes the published transfer callback, verifies multipart
content and the original task UUID, then checks downloaded bytes/SHA-256 and
refusal to overwrite an existing destination.

Reproduce from the packaging directory with `npm ci`, `npm test`,
`npm run test:ctl`, `node scripts/render.mjs --check`, `ctl generate --check`,
`check`, x86_64 `build`, and `inspect`. The focused gate defaults to the installed
published CLI. Exact artifact identifiers and device acceptance are recorded in
[ctl-validation.json](../ctl-validation.json).
