# Store listing (Google Play / F-Droid)

**Name:** Flipside: Focus Study Timer
**Package:** com.flipside.focus
**Category:** Education (alt: Productivity)
**Price:** Free, open source (MIT)

## Short description (80 chars max)
Flip your phone face-down to focus. Plan, track and remember. Fully offline.

## Full description
Flipside starts your timer the moment you lay your phone screen-down and stops when you pick it up. No taps, no willpower, nothing to forget.

FOCUS
- Flip to start, lift to stop (or pause and flip back to resume)
- Stopwatch, Pomodoro (25/5, 50/10, 52/17, 90/20) and Flowtime
- Calibrate flip detection to your own phone
- Optional offline focus sounds and Do Not Disturb during sessions

PLAN
- A 10-minute dot grid shows what you planned and what you actually did
- Auto-plan fills your week from your exams and topics
- Reminders before study blocks (optional)

STUDY
- Subjects, topics and exams with a calendar
- Syllabus coverage and weekly targets per subject
- Flashcards with FSRS or SM-2 spaced repetition, cloze, reverse and image cards

UNDERSTAND
- Overall and per-subject or per-topic stats
- Weekly review, goals, streaks with a rest day, heatmap and best focus hours
- Tap any day to see sessions, notes and your three-line diary; edit or add sessions

PRIVATE BY DESIGN
- No account, no ads, no analytics
- No internet permission: your data cannot leave your phone
- Backup to a folder you choose; export and import JSON
- Open source (MIT)

Six home-screen widgets, dark and light themes, and 7 languages (English, हिन्दी, Español, Português, Bahasa Indonesia, Français, Deutsch).

## Play Console answers
- **Data safety:** no data collected, no data shared, no data encrypted in transit (nothing transmitted). Users can delete data in-app.
- **Permissions to justify:** foreground service (special use: keeps flip detection alive while the user switches apps), notification policy access (optional Do Not Disturb), post notifications, vibrate.
- **Foreground service declaration:** type specialUse, subtype "on-device focus timer motion detection".
- **Content rating:** Everyone. **Ads:** none. **Target audience:** 13+ (students).
- **Privacy policy URL:** host PRIVACY.md (e.g. the repository's raw page).

## Assets you still need to supply
- Phone screenshots (at least 2, 16:9 or 9:16): Timer, Plan, Study, Stats, Flashcards, widgets
- Feature graphic 1024×500
- 512×512 icon (use `assets/images/icon.png`, resized)

## Release steps
1. `npx eas-cli build -p android --profile production` (AAB)
2. Upload to Play Console internal testing, complete the declarations above, then promote.
3. F-Droid: see `fdroid/com.flipside.focus.yml` (needs a public repository URL and a tagged release).
