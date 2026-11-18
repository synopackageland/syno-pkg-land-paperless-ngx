# Changelog

## 3.5.0-0001

- en: Update Paperless-ngx to 3.5.0 with manual workflow triggers, Markdown notes and background bulk edits
- zh-TW: Paperless-ngx 更新至 3.5.0，新增手動觸發工作流程、Markdown 備註與背景批次編輯
- zh-CN: Paperless-ngx 更新至 3.5.0，新增手动触发工作流、Markdown 备注与后台批量编辑
- ja: Paperless-ngx を 3.5.0 に更新し、ワークフローの手動実行、Markdown メモ、バックグラウンド一括編集に対応
- ko: Paperless-ngx 3.5.0으로 업데이트하여 워크플로 수동 실행, Markdown 메모, 백그라운드 일괄 편집 지원
- de: Paperless-ngx auf 3.5.0 aktualisieren mit manuell auslösbaren Workflows, Markdown-Notizen und Massenbearbeitung im Hintergrund
- fr: Mettre à jour Paperless-ngx vers 3.5.0 avec déclenchement manuel des workflows, notes Markdown et modifications groupées en arrière-plan
- es: Actualizar Paperless-ngx a 3.5.0 con activación manual de flujos de trabajo, notas en Markdown y ediciones masivas en segundo plano
- it: Aggiornare Paperless-ngx alla 3.5.0 con attivazione manuale dei flussi di lavoro, note in Markdown e modifiche di massa in background

Upgrades the official Paperless-ngx image from 3.4.0 to 3.5.0 (pinned by
multi-platform index digest). Upstream 3.5.0 adds manual workflow triggers,
Markdown rendering for document notes, background (async) bulk edits and
automatic session cleanup, plus many fixes. PostgreSQL, Redis, CLI 0.53.16,
SDK/App 0.53.25 and the DSM sign-in, storage and privilege policy are unchanged.
The package does not set `PAPERLESS_URL` or `PAPERLESS_ALLOWED_HOSTS`, so the
upstream 3.5.0 allowed-hosts change keeps its previous default.

The personal-token ctl inventory was re-reviewed against the 3.5.0 source: every
router, explicit URL, decorated action and UI route still has a coverage
decision and the 25 selected operations are unchanged.

Validation: package unit/contract tests, check, build and inspect, plus privacy
scans. Browser, container-runtime and device acceptance tests were not run.

## 3.4.0-0013

- en: Improve installation reliability in Package Center
- zh-TW: 提升在套件中心安裝的穩定性
- zh-CN: 提升在套件中心安装的稳定性
- ja: パッケージセンターでのインストールの安定性を向上
- ko: 패키지 센터에서의 설치 안정성 향상
- de: Zuverlässigkeit der Installation im Paket-Zentrum verbessern
- fr: Améliorer la fiabilité de l’installation dans le Centre de paquets
- es: Mejorar la fiabilidad de la instalación en el Centro de paquetes
- it: Migliorare l’affidabilità dell’installazione nel Centro pacchetti

Rebuilt with CLI 0.53.16. The ingress, gateway and Portal nginx reload is now
declared only for package start and stop: INFO keeps
`startstop_restart_services="nginx.service"` and no longer sets
`instuninst_restart_services`. The install-time reload could collide with DSM
`API.Info` and make Package Center show a `t.indexOf` error after installing.
SDK, App runtime, upstream version and image are unchanged.

## 3.4.0-0012

- Store temporary and runtime files on disk scratch instead of memory tmpfs
- Use published CLI 0.52.16 and SDK/App 0.53.25 (executor 0.53.6)
- Keep all services running as the package account with unchanged privileges

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
