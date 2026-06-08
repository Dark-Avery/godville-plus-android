# Third-Party Notices

## Erinome Godville UI+

- Version: 1.1.39.8
- Homepage: https://gv.erinome.net/
- Bundled source: `app/src/main/assets/erinome`
- License: Erinome License
- License text: `app/src/main/assets/erinome/LICENSE`

The bundled loader contains a small Godville+ compatibility patch that restricts
privileged `window.message` handling to the current window and exact origin.
Additional readable patches validate imported/rendered data, restrict custom
expression properties, disable cloud-settings transfer and automatic external
forum image loading in the Android build. Android integration is kept in the
first-party adapter and Kotlin files.

Important snapshot hashes:

```text
manifest.json  37c1dfb3cd06e14203a825715a0cde56a8e63206fecf4a73bbe56efceea4b0ec
loader.js      9bff8985a08bd5e00010179c6bbd31be03aef08ebb2412824cb86c5b838b1b66
common.js      3d58c79c8d141042ad86e0a053efd74ae57e9b5cdd4885fdcbbe5778fdde5a51
superhero.js   b8c000d1d9250cea0476dcb668252914e468fd2fbd48112a71e1e622cdbc39cd
log.js         50ccc7a4b0dc49d9b9b60eacaf286a1bc1c539c48b0702e4fdcd5f821d28688c
forum.js       686784d4e2bf8f4be4c795fe10a4bd06d7d08fe8ef8a78769f5ecb1f25806da4
options.js     ba0a9b83f506951350420b335f821b42617d487f0c70f9f42a46f72ac2305e86
```

## Libraries bundled by Erinome

The Erinome snapshot includes:

- `base64-js` 1.2.2, MIT License, copyright Jameson Little,
  https://github.com/beatgammit/base64-js/tree/v1.2.2;
- `jsep` 0.3.4, MIT License, copyright Stephen Oney;
- `pako` 1.0.6, MIT License, copyright Vitaly Puzrin and Andrei Tuputcyn,
  https://github.com/nodeca/pako/tree/1.0.6.

Their upstream license texts are preserved in `third_party/licenses`.

## Android dependencies

AndroidX and the Android Gradle Plugin are distributed under the Apache License
2.0. Gson is distributed under the Apache License 2.0. JUnit 4 is distributed
under the Eclipse Public License 1.0. Dependency versions are declared directly
in the Gradle build files.
