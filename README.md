# Flipside

A study timer you start by putting your phone face-down.

I kept losing focus every time I picked up my phone to start a timer, so I built one that works the other way round. Lay the phone screen-down on your desk and the clock starts. Pick it up and it stops. That's the whole idea, and everything else in the app grows around it.

No account, no ads, no tracking. The app doesn't even have permission to use the internet, so your data stays on your phone.

## Download

Android only.

**[Download FlipSide.apk](https://github.com/shanthoshkv/flipside/releases/latest/download/FlipSide.apk)** (about 136 MB)

Open the file on your phone and allow "install from this source" when Android asks. If you have an older build installed, uninstall it first.

## How it works

1. Pick what you're studying.
2. Put the phone face-down. After a second, the timer starts.
3. Lift it when you're done. Sessions shorter than 10 seconds are thrown away.

The timer keeps running if you switch apps or the screen turns off, and it survives the app being killed. If you'd rather not flip, there's a Start button too. Flip sensitivity can be calibrated for your phone.

## What's in it

- **Timer**: stopwatch, Pomodoro (25/5, 50/10, 52/17, 90/20) and Flowtime. Pause by flipping back.
- **Plan**: a 10-minute grid for each day, so you can see what you planned next to what you did. There's also an auto-planner that puts the nearest exam first and mixes subjects.
- **Study**: subjects and topics, exams with a countdown, weekly targets, syllabus coverage.
- **Flashcards**: spaced repetition (FSRS or SM-2), cloze deletions, reverse cards, image cards, and text import.
- **Stats**: totals by subject, streaks (with a rest day), heatmaps, best hours of the day, focus quality, a weekly review, and a yearly calendar. You can also edit or add sessions by hand.
- **Little things**: offline focus sounds, Do Not Disturb while you focus, reminders, six home screen widgets, and 7 languages.

## Your data

Everything lives in a SQLite database on your device. Once a day the app can save a JSON backup into a folder you choose (it keeps the last 7), and you can restore from it in Settings. Details are in [PRIVACY.md](PRIVACY.md).

## Building it yourself

You need a native build, so Expo Go won't work (the widgets, background service and Do Not Disturb module are native).

```bash
npm install
npx tsc --noEmit    # type check
npm run check       # logic tests: flip detector, SRS, planner, stats, reminders

# cloud build, gives you an APK
npx eas-cli login
npx eas-cli build -p android --profile preview

# or build locally with Android Studio installed
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

Built with Expo (SDK 57), TypeScript, expo-router, zustand and expo-sqlite. Charts are hand-drawn SVG.

## Project layout

| Path | What's there |
|---|---|
| `src/app` | screens and routes |
| `src/engine` | flip detector, timer store, flashcard scheduling, planner |
| `src/db.ts` | SQLite and migrations |
| `src/stats.ts`, `src/weekly.ts` | analytics, all pure functions |
| `src/widgets` | Android home screen widgets |
| `modules/focus-mode` | Do Not Disturb module (Kotlin) |
| `src/locales` | translations |

## Helping out

Translations are the easiest way to contribute. They live in `src/locales/`, with the English text as the key. If you speak one of the languages and spot something off, please fix it. For code changes, keep logic in pure functions and add a check to `scripts/check.ts`.

## Credits and licence

Sound and font credits are in [CREDITS.md](CREDITS.md). The code is MIT licensed, see [LICENSE](LICENSE).
