# Contributing

## Development setup

Use JDK 17 and Android SDK 34.

```bash
./gradlew test lintDebug assembleDebug
```

Keep changes focused and add unit tests for URL, origin, message or network
policy changes. Do not add analytics, advertising SDKs, remote executable code,
cleartext traffic or broad JavaScript-to-native APIs.

## Erinome updates

Treat `app/src/main/assets/erinome` as a reviewed upstream snapshot. Preserve
its license, readable source and third-party notices. Keep Android-specific
changes minimal and document changed hashes in `THIRD_PARTY_NOTICES.md`.

## Pull requests

Explain user-visible behavior, security impact, tests run and any new network
destination or Android permission. Never commit signing keys, passwords,
cookies, `local.properties` or generated APKs.
