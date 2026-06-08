# Privacy

Godville+ has no analytics, advertisements, account database or project-owned
server.

The Android WebView stores the same kinds of local data as a browser: Godville
cookies, DOM storage and cache. Android backup and device-transfer export are
disabled for the application.

Background monitoring sends the current Godville cookie only to the fixed URL
`https://godville.net/superhero`. The returned page is processed locally into a
SHA-256 state fingerprint. The raw page and cookie are not written to project
logs or sent to another service.

UI+ requests to the exact Godville hosts may also receive the matching WebView
cookie, as they would in the browser extension. The native policy prevents that
cookie from being attached to Erinome, phrase-database, time or other hosts.

Erinome UI+ can contact the services listed in `docs/ARCHITECTURE.md` for phrase
databases, time, version checks, reporter streaming and traders. Native requests
are restricted to the documented endpoints. Erinome cloud-settings
upload/download and automatic external forum image loading are disabled in the
Android build.
