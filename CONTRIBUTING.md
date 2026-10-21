# Contributing

1. `npm ci`, then `npm run check` and `npx tsc --noEmit` must pass (CI runs both).
2. Keep files under 250 lines. Pure logic goes in plain `.ts` files with an assert in `scripts/check.ts`.
3. No network: the INTERNET permission is blocked and CI fails if that changes.
4. UI text: English is the key. Add translations as a row in `src/locales/strings2.ts` (all 6 columns, same `{placeholders}`).
5. Native build needed (not Expo Go): `npx eas-cli build -p android --profile preview`.
