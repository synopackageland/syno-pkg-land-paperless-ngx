# Changelog

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
