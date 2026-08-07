# Suffering Reborn

A standalone browser prototype of the medieval city-building card game.

## Run locally

```bash
npm install
npm run dev
```

## What works

- Local human versus bots.
- Draw from the deck and the three-card crossroads.
- City placement, epidemics, crusade pool depletion, relic awards, and end scoring.
- Card art from the original local asset set.

This is a focused prototype, not a full rules-complete adaptation: many character-specific instant effects are still deliberately simplified.

Card quantities are centralized in `src/card-counts.js`; the complete runtime catalogue is in `src/cards.js`.

Bug reports are sent by `api/bugreport.js` to the shared Politikum bugs channel (`-5260075189`). Set `TELEGRAM_BOT_TOKEN` in the deployment environment; `TELEGRAM_BUG_CHAT_ID` may override the shared destination when explicitly needed.
