# Card Ability Ledger

The original `rules.md` is useful as a reference but not as a reliable implementation spec.
Use this file as the source of truth for card abilities. Write in plain language; exact Russian wording is welcome, but examples and edge cases are even better.

## How to fill this in

- `Asset` is the stable identifier used by the game and must not change.
- Set `Copies` here and mirror it in [`src/card-counts.js`](src/card-counts.js).
- In `Rules / edge cases`, state targets, timing, choices, and what happens when there is no valid target.
- `Status` is for us: `TODO`, `implemented`, or `needs question`.
- The six `*-start.webp` files are epidemic-origin tokens, not deck cards; they are intentionally excluded.

| Asset | Card | Copies | Rules / edge cases | Status |
| --- | --- | ---: | --- | --- |
| adaptable.webp | Приспособленец |  |  | TODO |
| baby.webp | Ребёнок |  |  | TODO |
| bard.webp | Бард |  |  | TODO |
| black_pox.webp | Чёрная оспа | 1 |  | TODO |
| bubonic_plague.webp | Бубонная чума | 1 |  | TODO |
| burglar.webp | Бандит |  |  | TODO |
| carry.webp | Извозчик |  |  | TODO |
| cat.webp | Кот |  |  | TODO |
| cholera.webp | Холера | 1 |  | TODO |
| corpse.webp | Труп |  |  | TODO |
| crossbowman.webp | Арбалетчик |  |  | TODO |
| cupbearer.webp | Виночерпий |  |  | TODO |
| deserter.webp | Дезертир |  |  | TODO |
| devil.webp | Дьявол |  |  | TODO |
| devka.webp | Девка |  |  | TODO |
| episcop.webp | Епископ | 1 |  | partial |
| executioner.webp | Палач | 2 |  | TODO |
| fanatic.webp | Фанатик |  |  | TODO |
| guard.webp | Стражник | 2 |  | TODO |
| hare.webp | Заяц |  |  | TODO |
| heretic-alch.webp | Еретик-алхимик | 1 |  | TODO |
| heretic-necro.webp | Еретик-некромант | 1 |  | TODO |
| heretic-science.webp | Еретик-натуралист | 1 |  | TODO |
| hermit.webp | Отшельник |  |  | TODO |
| hg1.webp | Наёмник I |  |  | TODO |
| hg2.webp | Наёмник II |  |  | TODO |
| hg3.webp | Наёмник III |  |  | TODO |
| innkeeper.webp | Трактирщик | 2 |  | TODO |
| inquisitor.webp | Инквизитор | 1 |  | partial |
| jester.webp | Шут | 1 |  | TODO |
| knight.webp | Рыцарь | 3 |  | TODO |
| kolya.webp | Коля | 1 |  | TODO |
| lady.webp | Леди | 2 |  | TODO |
| leper.webp | Прокажённый | 1 |  | partial |
| leprosy.webp | Лепра | 1 |  | partial |
| lord.webp | Лорд | 2 |  | TODO |
| malaria.webp | Малярия | 1 |  | TODO |
| merchant.webp | Торговка | 2 |  | TODO |
| midget.webp | Карлик |  |  | TODO |
| monk.webp | Монах | 4 |  | partial |
| mutilator.webp | Уродователь |  |  | TODO |
| peasant.webp | Крестьянин | 7 |  | partial |
| plague_doc.webp | Чумной доктор | 5 |  | partial |
| possesed.webp | Одержимый |  |  | TODO |
| preacher.webp | Проповедник | 1 |  | partial |
| priest.webp | Священник |  |  | TODO |
| recruit.webp | Рекрутёр | 2 |  | TODO |
| standard_bearer.webp | Знаменосец |  |  | TODO |
| syphilis.webp | Сифилис |  |  | TODO |
| templar.webp | Тамплиер |  |  | TODO |
| troubadur.webp | Менестрель | 1 |  | TODO |
| virgin.webp | Девственница | 1 |  | TODO |
| warhorse.webp | Боевой конь | 2 |  | TODO |
| weapon_bearer.webp | Оруженосец | 2 |  | TODO |
| whore.webp | Распутная девка | 2 |  | TODO |
| witch.webp | Ведьма | 2 |  | TODO |
