# Converso

A hands-free voice translator for iOS and Android. Speak into your phone and hear the translation spoken back in the target language. Built with React Native.

## What it does

Converso listens to your speech through the device microphone, converts it to text, sends that text to a translation API, and speaks the translated result out loud. In hands-free mode the cycle repeats automatically — listen, translate, speak, listen again — so you can use it as a live interpreter without touching the screen between turns.

Currently toggles between English and Spanish. Adding more language pairs is a matter of extending a small lookup in `src/services/translate.ts`.

## Stack

| Layer | Library |
| --- | --- |
| Framework | React Native 0.81 |
| Speech-to-text | [@react-native-voice/voice](https://github.com/react-native-voice/voice) |
| Text-to-speech | [react-native-tts](https://github.com/ak1394/react-native-tts) |
| Translation | [MyMemory Translated API](https://mymemory.translated.net/doc/spec.php) (keyless, free tier) |
| Language | TypeScript |

## Requirements

- Node.js 20 or newer
- For iOS: macOS with Xcode 15+, CocoaPods (via Bundler), an iOS 17+ simulator or a physical device
- For Android: Android Studio with an SDK 34 emulator, or a physical device with USB debugging enabled

## Getting started

Clone the repo and install JavaScript dependencies:

```sh
git clone https://github.com/jacquesme/Converso.git
cd Converso
npm install
```

### iOS

One-time setup to install Ruby gems and CocoaPods:

```sh
bundle install
cd ios && bundle exec pod install && cd ..
```

Then start Metro and launch the app:

```sh
npm start         # in one terminal
npm run ios       # in another terminal
```

The iOS Simulator will open and install the app.

### Android

Make sure an emulator is running or a device is connected (`adb devices` should list it). Then:

```sh
npm start          # in one terminal
npm run android    # in another terminal
```

## Permissions

Both platforms need microphone access. Speech recognition additionally needs its own permission on iOS.

On **iOS**, the following keys must be present in `ios/Converso/Info.plist`:

- `NSMicrophoneUsageDescription` — string explaining why the mic is needed
- `NSSpeechRecognitionUsageDescription` — string for speech recognition

On **Android**, `RECORD_AUDIO` is requested at runtime by the app itself; no manifest changes required beyond what's already in `android/app/src/main/AndroidManifest.xml`.

## Using the app

The UI is deliberately minimal. Four buttons:

- **Listen / Stop** — toggles the microphone on and off
- **Speak** — re-speaks the last heard phrase (translated)
- **Hands-free ON/OFF** — when on, listening resumes automatically after each translation is spoken
- **Lang** — toggles target language between EN and ES

The status rows at the top show whether the mic is active, whether TTS is speaking, whether hands-free is on, and the current target language.

## How the hands-free loop works

1. User speaks into the mic.
2. `@react-native-voice/voice` returns the recognised text.
3. The text is sent to the MyMemory translation API.
4. `react-native-tts` speaks the translated result.
5. The `tts-finish` event fires and listening resumes — back to step 1.

All of this is wired up in `App.tsx` through a single-run `useEffect` with ref-based state access, so toggling hands-free or the language does not tear down the Voice engine mid-session.

## Translation notes

MyMemory allows about 5,000 words per day per IP address anonymously, and about 50,000 per day if you pass an email address with each request. To raise your limit, set `CONTACT_EMAIL` at the top of `src/services/translate.ts` to a real email. No signup required.

If the API fails (rate limit, network, quota), the app falls back to speaking the original text and logs a `[translate]` warning to the Metro console, so you can see in dev when translation silently fails.

## Project layout

```
Converso/
├── App.tsx                  # main component; Voice + TTS + hands-free logic
├── src/services/
│   └── translate.ts         # MyMemory translation client
├── __tests__/               # Jest tests
├── __mocks__/               # native module mocks for tests
├── android/                 # native Android project
├── ios/                     # native iOS project + Podfile
└── package.json
```

## Running the tests

```sh
npm test
```

Jest is configured with mocks for `@react-native-voice/voice` and `react-native-tts` in `__mocks__/`.

## Known limitations

- **iOS Simulator microphone is unreliable.** Speech recognition in the simulator depends on your Mac's mic being piped through, and results are often poor. Test voice features on a real iPhone for accurate behaviour.
- **No source-language detection.** MyMemory's free tier requires explicit source and target languages, so Converso infers the source as the opposite of the target (EN ↔ ES). If you speak a third language, recognition will fail.
- **Hands-free and loud environments don't mix.** The mic can pick up its own TTS output through the speaker and loop on itself. Converso gates re-listening on the `tts-finish` event to minimise this, but headphones are recommended for reliable hands-free use.

## Roadmap

- Additional language pairs (FR, DE, PT, IT)
- On-device recognition locale selection (not hard-coded to `en-US`)
- Configurable TTS voice, rate, and pitch
- Persistent transcript history
- Self-hosted LibreTranslate option for private deployments

## License

MIT.
