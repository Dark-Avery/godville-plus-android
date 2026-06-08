# Godville+

Неофициальное Android-приложение для [Godville](https://godville.net/) со
встроенным [Erinome Godville UI+](https://gv.erinome.net/) 1.1.39.8.

Проект не связан с разработчиками Godville или Erinome и не является их
официальным приложением.

## Возможности

- системный Android WebView с cookies и DOM storage;
- UI+ поставляется внутри APK и работает без браузерного расширения;
- нативные уведомления UI+ при открытом приложении;
- экономичный фоновый опрос примерно раз в 15 минут;
- быстрый foreground-мониторинг с постоянным системным уведомлением;
- внешние ссылки открываются в браузере, а не внутри WebView.

Это не настоящий server push: у проекта нет собственного сервера. Фоновый
режим периодически запрашивает `https://godville.net/superhero`.

## Безопасность и приватность

- JavaScript-мост доступен только главным документам точных Godville origins.
- Нативные HTTP-запросы UI+ ограничены HTTPS, известными хостами, методами,
  путями, портом 443, таймаутами и размером ответа.
- HTTP, mixed content, `file://`, content access и third-party cookies
  отключены.
- Android backup и перенос приватных данных приложения отключены, чтобы сессия
  WebView не попадала в резервную копию.
- Приложение не содержит аналитики, рекламы и собственного backend.

Разрешённые внешние сервисы и потоки данных описаны в
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) и
[`PRIVACY.md`](PRIVACY.md).

## Сборка

Требуются JDK 17 и Android SDK 34.

```bash
./gradlew test lintDebug assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Release APK

Release-ключ не создаётся автоматически и не хранится в репозитории.

```bash
export GODVILLE_PLUS_STOREPASS='use-a-strong-secret'
scripts/create-release-key.sh
```

После создания ключа опубликуйте его SHA-256 certificate fingerprint в
`release-certificate.sha256`. Текущий fingerprint закреплён для совместимости
обновлений.

```bash
export GODVILLE_PLUS_STOREPASS='use-a-strong-secret'
scripts/build-release.sh
```

Готовый APK:
`app/build/outputs/apk/release/godville-plus-release.apk`.

### GitHub Releases

Workflow `.github/workflows/release.yml` собирает и публикует подписанный APK
при push тега, совпадающего с `versionName`, например `v0.1.0`.

В GitHub environment `release` должны быть настроены secrets:

- `GODVILLE_PLUS_KEYSTORE_BASE64`;
- `GODVILLE_PLUS_STOREPASS`;
- `GODVILLE_PLUS_KEYPASS`.

Keystore переводится в Base64 одной строкой:

```bash
base64 -w 0 ~/.config/godville-plus/release.jks
```

Для environment `release` рекомендуется включить required reviewers. Workflow
сверяет tag, dependency checksums, JavaScript guards, APK certificate и
критические bundled assets перед публикацией. Рядом с APK публикуется точный
граф runtime-зависимостей release-сборки.

Полная процедура и ротация паролей: [`docs/RELEASING.md`](docs/RELEASING.md).

## Обновление UI+

UI+ хранится в `app/src/main/assets/erinome`. Обновление выполняется отдельным
reviewable изменением: заменяется upstream snapshot, повторно применяются
минимальные Android-адаптации, обновляются версия, hashes и notices, после чего
запускаются тесты и проверка APK. Приложение намеренно не загружает исполняемый
JavaScript при запуске.

## Ограничения

- Android может откладывать экономичные alarm-проверки.
- Быстрый режим расходует больше батареи и трафика.
- После выхода из Godville фоновый режим просит снова войти.
- Android 15+ может ограничивать долгую непрерывную foreground-работу.

## Участие

См. [`CONTRIBUTING.md`](CONTRIBUTING.md). Уязвимости следует сообщать по
инструкции из [`SECURITY.md`](SECURITY.md), не создавая публичный issue.

## Лицензии

Код Android-обёртки распространяется по MIT License, см. [`LICENSE`](LICENSE).
Erinome UI+ и встроенные библиотеки сохраняют собственные лицензии, см.
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
