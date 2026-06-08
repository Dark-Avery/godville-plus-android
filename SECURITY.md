# Security Policy

## Supported version

Security fixes are applied to the latest source revision and the latest
published APK.

## Reporting a vulnerability

Do not open a public issue for an unpatched vulnerability. Use GitHub private
vulnerability reporting when it is enabled for the repository. Include:

- affected version or commit;
- reproduction steps;
- expected impact;
- relevant Android and WebView versions;
- a minimal proof of concept when safe.

Do not access other users' accounts, disrupt Godville or Erinome services, or
publish session cookies and signing material.

## Security boundaries

The most sensitive surfaces are the Godville WebView session, the origin-scoped
JavaScript bridge, the native HTTP allowlist, background monitoring and release
signing. See `docs/ARCHITECTURE.md` for the current controls.
