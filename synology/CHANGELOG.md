# Changelog

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
