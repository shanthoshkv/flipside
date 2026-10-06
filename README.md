# Flipside
Place phone screen-down to focus; lift to stop. Plan, stats, widgets. Local-first, no account.

- Dev build only (widgets are native): `npx eas-cli build -p android --profile preview`
- Checks: `npm run check`, `npx tsc --noEmit`, `npx expo-doctor`
- Known limit: timer runs while app is foregrounded with screen kept awake; background foreground-service is next.
