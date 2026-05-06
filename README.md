# PharmaCare POS Frontend

This repository contains the POS tablet frontend and POS mobile test pipeline setup.

## Requirements

- Node.js 20 LTS
- npm 10+
- Expo Go or an Expo dev build when running an Expo tablet shell

## Setup

```bash
npm ci
cp .env.example .env.local
```

Fill in the Supabase and API values in `.env.local`. Do not commit local environment files.

## Run Locally

```bash
npm run dev
```

The local POS frontend runs at `http://localhost:3000` by default.

For an Expo-hosted tablet shell, point the shell at the same API and Supabase values from `.env.example`, then start the Expo app with:

```bash
npx expo start
```

## Tests

Run the POS mobile unit tests with the Expo Jest preset:

```bash
npm run test:pos-mobile
```

The mobile suite covers VAT-inclusive receipt calculations and offline queue push/pop behavior. Coverage is written to `coverage/pos-mobile`, with a minimum global threshold of 60% for statements, lines, and functions.

## CI/CD

`.github/workflows/pos-mobile-tests.yml` runs `npm run test:pos-mobile` on every push to `pos-mobile`, relevant PRs, and manual dispatch.
