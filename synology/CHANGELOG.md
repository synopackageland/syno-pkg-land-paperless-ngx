# Changelog

## 3.3.3-0007

- Rebuild 3.3.3-0007 with SDK/App 0.29.1 and CLI/templates 0.29.0, retaining executor/v0.27.0. Upstream images and App configuration are unchanged. No NAS testing was performed for this rebuild.
- 使用 SDK/App 0.29.1 與 CLI/templates 0.29.0 重建，保留 executor/v0.27.0；上游映像與 App 設定不變，本次未進行 NAS 測試

## 3.3.3-0006

- Rebuild 3.3.3-0006 with published SDK/App/CLI/templates 0.28.0 (executor/v0.27.0), UI 0.14.4 and Go 1.26.10, with the SDK's slow-NAS startup defaults (generous health/readiness timing and a Starting status in the UI). Official images and application sources are unchanged. No NAS test was run for this rebuild.
- 3.3.3-0006 使用已發佈 SDK/App/CLI/templates 0.28.0（executor/v0.27.0）、UI 0.14.4 與 Go 1.26.10 重建，並採用 SDK 的慢速 NAS 啟動預設值（較寬鬆的健康/就緒檢查時間，以及介面中的「啟動中」狀態）。官方映像與上游程式維持原樣。此次重建未進行 NAS 實機測試。

## 3.3.3-0005

- Rebuild 3.3.3-0005 with published SDK/App/CLI/templates 0.26.0, UI 0.14.4 and Go 1.26.10. Maintainer: Syno Package Land. Official images and application sources are unchanged. Check the selected shared folder permissions before starting; grant the package account the required access in DSM.
- 3.3.3-0005 使用已發佈 SDK/App/CLI/templates 0.26.0、UI 0.14.4 與 Go 1.26.10 重建；維護者顯示為 Syno Package Land。 官方映像與上游程式維持原樣。 啟動前檢查所選共用資料夾權限；請在 DSM 授予套件帳號所需存取權限。
