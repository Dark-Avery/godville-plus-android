# Releasing

## One-time setup

1. Create or select the release keystore.
2. Record its certificate SHA-256 digest in `release-certificate.sha256`.
3. Create a protected GitHub environment named `release`.
4. Add these environment secrets:

```text
GODVILLE_PLUS_KEYSTORE_BASE64
GODVILLE_PLUS_STOREPASS
GODVILLE_PLUS_KEYPASS
```

Set `GODVILLE_PLUS_KEYSTORE_BASE64` to the output of:

```bash
base64 -w 0 ~/.config/godville-plus/release.jks
```

Enable required reviewers for the `release` environment so a pushed tag cannot
publish an APK without an explicit approval.

The release job requires the tag commit to be contained in `origin/main` and
rejects lightweight tags. Protect `main`, require the Android workflow, and
limit tag creation to maintainers.

## Password rotation

Early local builds used a known fallback password. If that keystore will be
used for public releases, rotate both passwords before uploading it to GitHub:

```bash
export OLD_STOREPASS='current password'
export OLD_KEYPASS='current key password'
export NEW_STOREPASS='new strong password'
export NEW_KEYPASS='new strong key password'

keytool -storepasswd \
  -keystore ~/.config/godville-plus/release.jks \
  -storepass:env OLD_STOREPASS \
  -new:env NEW_STOREPASS

keytool -keypasswd \
  -keystore ~/.config/godville-plus/release.jks \
  -alias godville-plus \
  -storepass:env NEW_STOREPASS \
  -keypass:env OLD_KEYPASS \
  -new:env NEW_KEYPASS
```

Changing passwords does not change the certificate fingerprint.

## Publishing

Update `versionCode`, `versionName` and `CHANGELOG.md`, merge the exact source
that should be published, then push a matching annotated tag:

```bash
git tag -a v0.1.0 -m "Godville+ 0.1.0"
git push origin v0.1.0
```

The release workflow verifies the tag, dependencies, bundled JavaScript,
signature identity and critical Erinome assets. It publishes the signed APK and
its SHA-256 checksum to GitHub Releases.

Gradle runs before the keystore and password secrets are made available. A
separate protected job signs the already-built unsigned APK, and a third job
publishes it without receiving signing secrets.
