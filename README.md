# Flipside

A study app built around one habit: **put your phone face-down to focus, lift it to stop.**
Local-first. No account, no ads, no analytics, and no internet permission.

## What it does
- **Flip timer**: choose a task, lay the phone screen-down, it starts. Lift to stop, or enable Pause and flip back to resume. Stopwatch, Pomodoro (25/5, 50/10, 52/17, 90/20) and Flowtime. Per-phone calibration. Works while you switch apps.
- **Plan**: 10-minute dot grid, plan versus actual at a glance, drag to paint, one-tap auto-planner (nearest exam first, subjects interleaved).
- **Study**: subjects, topics, exams with a calendar, syllabus coverage, weekly targets.
- **Flashcards**: FSRS or SM-2 scheduling, cloze, reverse and image cards, daily limits, forecast, text import.
- **Stats**: overall and per task or topic, weekly review, goals, streaks with a rest day, heatmap, hour-of-day, focus quality, day detail with notes and diary, edit or add sessions.
- **Extras**: offline focus sounds, Do Not Disturb while focusing, reminders, six Android widgets, daily backup to a folder you choose, 7 languages.

## Privacy
Everything is stored in a SQLite database on the device. The release build declares no `INTERNET` permission, so it cannot send data anywhere. See [PRIVACY.md](PRIVACY.md).

## Build
Native build required (widgets, background service and a local module), so Expo Go will not work.

```
npm install
npx tsc --noEmit        # types
npm run check           # logic checks: detector, SRS, planner, stats, reminders, contrast
npx eas-cli login && npx eas-cli build -p android --profile preview   # APK
npx eas-cli build -p android --profile production                      # AAB for the Play Store
```
Or locally with Android Studio: `npx expo prebuild --platform android && cd android && ./gradlew assembleRelease`.

## Layout
`src/app` screens and routes | `src/engine` flip detector, timer store, SRS, planner | `src/db.ts` SQLite and migrations | `src/stats.ts` `src/weekly.ts` pure analytics | `src/widgets` Android widgets | `modules/focus-mode` Do Not Disturb (Kotlin) | `src/locales` translations.

## Contributing
Translations live in `src/locales/*.ts` (English text is the key). Native-speaker fixes are very welcome. Keep logic in pure functions and add an assert to `scripts/check.ts`.

## Licence
MIT, see [LICENSE](LICENSE).
