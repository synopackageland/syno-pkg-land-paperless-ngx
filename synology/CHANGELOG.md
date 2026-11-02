# Changelog

## 3.4.0-0004

- Declare the fixed DSM path and remove the public gateway port
- Configure native Paperless static, script-name and Granian path prefixes
- Preserve OIDC, App privileges, native API authentication and retained storage
- Update existing browser scenarios to the namespace and add assets/API/WebSocket coverage
- Pin CLI 0.43.0, templates 0.38.0 and SDK/App 0.43.1
- Validate in-place upgrade, retained document content and focused browser scenarios

## 3.4.0-0003

- Rebuild with CLI 0.42.2, SDK/App 0.42.0 and templates 0.37.0
- Retain upstream 3.4.0 and all immutable container image references
- Pass x86_64 check/build/inspect and the existing nine local tests
- Verify an in-place upgrade, retained settings/volumes and administrator dashboard access
- Record the unresolved daemon-ingress path acceptance mismatch in README.md

## 3.4.0-0002

- Pin SDK/App 0.38.2, CLI 0.41.9 and templates 0.35.5
- Default to an App-named dedicated read/write consume share
- Enable installer-selected ports and bind upstream OIDC configuration to the selected issuer port
- Add the CLI A/N/X smoke using the native Paperless dashboard ready marker
- Build, inspection, in-place device upgrade and A/N/X App-open smoke pass


## 3.3.3-0011: SDK entry-gate migration

Built with SDK/App/templates 0.32.0, CLI 0.34.0 and executor v0.32.0.
Only `/api` use upstream authentication; all other browser paths retain the DSM entry gate.
Protected executor payloads changed: administrator approval is required again after upgrading.
No NAS installation or device acceptance was performed for this rebuild.

## 3.3.3-0008

- Improve opening the App from the DSM menu and external access settings
- 改善從 DSM 選單開啟 App 與外網存取設定
