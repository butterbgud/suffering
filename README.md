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

Rules work is tracked in [CARD_ABILITIES.md](CARD_ABILITIES.md). Card quantities are centralized in `src/card-counts.js`.
Structured card data and descriptions live in [cards.yaml](cards.yaml).
