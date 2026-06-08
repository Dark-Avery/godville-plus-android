# Architecture

## Components

- `MainActivity` owns the WebView and the origin-scoped message bridge.
- `GodvilleWebViewClient` restricts navigation and injects UI+ only into exact
  Godville origins.
- `ErinomeInjector` loads a fixed list of bundled JavaScript and CSS assets.
- `ErinomeWebRequestExecutor` implements the small cross-origin HTTP surface
  required by UI+.
- monitoring classes perform fixed-URL background checks and local change
  detection.

No executable JavaScript is downloaded at runtime.

## Trust boundaries

The remote Godville page and all UI+ messages are treated as untrusted input.
Bridge messages are accepted only from the main frame of:

```text
https://godville.net
https://b.godville.net
https://godvillegame.com
```

Allowed native HTTP operations are defined in
`ErinomeWebRequestPolicy.kt`. They cover:

- Godville log, newspaper and god-profile API GET requests;
- Godville forum-informer POST requests to `/forums/last_in_topics`;
- Erinome version, reporter, map streamer and traders paths;
- Erinome phrase databases on `eximido.github.io`;
- the HTTPS time endpoint on `time.akamai.com`.

Only port 443 is accepted. Redirects are not followed. Request messages are
limited to 64 KiB and responses to 2 MiB. WebView cookies are attached only
when the already-approved request targets an exact Godville HTTPS host.

The upstream cloud-settings feature and automatic forum image loading are
disabled in the Android build to avoid URL-carried secrets and unsolicited
third-party requests.

## Background monitoring

Economy mode uses an inexact alarm. Fast mode uses a foreground service.
Requests have connection, read and wall-clock timeouts. Repeated failures use
capped backoff. Cookies are attached only to the fixed Godville superhero URL.

## Release integrity

The release certificate SHA-256 fingerprint is stored in
`release-certificate.sha256`. `scripts/verify-apk.sh` verifies the signature
identity and compares critical bundled Erinome assets with the checked-out
sources.

Tagged builds must point to an annotated tag contained in `main`. The unsigned
build runs without signing secrets. A separate signing job runs in the protected
GitHub `release` environment, where the keystore is reconstructed only inside
the ephemeral runner from encrypted secrets. A third job receives no signing
secrets and publishes the APK, its SHA-256 checksum, source commit, tag,
certificate fingerprint and release runtime dependency graph to GitHub
Releases.
