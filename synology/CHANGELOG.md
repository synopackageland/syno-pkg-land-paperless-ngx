# Changelog

## 3.4.0-0011

- Select an existing NAS folder at any depth for the read/write document consumption mount
- Add regression coverage for legacy share-root upgrades and retained subfolders
- Use published CLI 0.52.15 and SDK/App 0.53.23 with the native chooser and older DSM fallback
- Keep all services running as the package account with unchanged privileges

## 3.4.0-0010

- Add 25 personal-token commands for documents, classification, notes and import tasks
- Complete bounded multipart upload and original download with byte count and SHA-256 receipts
- Preserve native task UUIDs and require explicit confirmation for writes
- Pin published CLI 0.52.5, templates 0.41.3 and SDK/App 0.53.4
- Narrow native-auth exceptions while retaining OIDC and app-privilege entry
- Keep the official 3.4.0 images and upstream source unchanged
