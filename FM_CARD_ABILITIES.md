# Feasts and Monsters — Card Ability Ledger

This is the expansion catalogue and implementation checklist. It is intentionally separate from `CARD_ABILITIES.md` so the original game can be verified independently.

`Copies` is the current temporary deck count. Replace it when the physical card count is confirmed. `Status` tracks implementation: `catalogued` means the card is represented in the deck, while `TODO` means its rules still need engine work.

## Additional original cards in this expansion

Feasts and Monsters adds these extra copies to the original catalogue. The Original mode does not include them.

| Original card | Additional copies |
| --- | ---: |
| Карлик (`midget.webp`) | 1 |
| Приспособленец (`adaptable.webp`) | 1 |
| Увещеватель (`mutilator.webp`) | 2 |
| Младенец (`baby.webp`) | 2 |

## Fiends and residents

| ID | Art | Card | Copies | Immunity | VP | Crusade | Type | Ability | Status |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| demon_herecy | demon_herecy.webp | Демон Ереси | 1 | - | 0 | - | Нечисть | +1 VP per negative resident and per Inquisitor, Pastor, or Preacher in this city. | catalogued / TODO |
| demon_lust | demon_lust.webp | Демон Похоти | 1 | - | 0 | - | Нечисть | +1 VP per negative resident, woman, Succubus, and Adaptable in this city. | catalogued / TODO |
| demon_party | demon_party.webp | Демон Кутежа | 1 | - | 0 | - | Нечисть | +1 VP per negative resident and per Fiend in this city; counts itself as Fiend. | catalogued / TODO |
| duchess | duchess.webp | Графиня | 2 | 9 | 4 | - | - | Lures a male commoner from an adjacent city and makes him a courtier. | catalogued / TODO |
| lady_virgin | lady_virgin.webp | Девственница | 3 | 12 | 2 | - | - | Activates one resident’s instant ability in this city; cannot become Fiend. | catalogued / TODO |
| leprechaun | leprechaun.webp | Лепрекон | 3 | - | 4 | - | Нечисть | Gives 2 points and forces a discard. | catalogued / TODO |
| leshiy | leshiy.webp | Леший | 2 | - | 0 | - | Нечисть | Moves a Crossroads resident to an adjacent city; that resident’s instant ability does not activate. | catalogued / TODO |
| mermaid | mermaid.webp | Утопленница | 1 | - | 0 | - | Нечисть | Cannot be killed, only burned. Moves right with one chosen resident. | catalogued / TODO |
| nunn | nunn.webp | Монахиня | 3 | 63 | 1 | 2 | - | Drives one Fiend away. | catalogued / TODO |
| succub | succub.webp | Суккуб | 2 | - | 4 | - | Нечисть | Searches until the first man or Monster, puts it in this city, then kills a man here. | catalogued / TODO |
| troll | troll.webp | Тролль | 2 | - | 0 | - | Нечисть | Attacks residents moving across its chosen city boundary; on 4–6 they are discarded. | catalogued / TODO |
| unicorn | unicorn.webp | Единорог | 1 | - | 4 | - | - | Moves any resident to an adjacent city and activates its ability. | catalogued / TODO |
| vurdalak2 | vurdalak2.webp | Вурдалак | 3 | - | 0 | - | Нечисть | Replaces a peaceful man; then moves toward a city containing Baby, Virgin, Nunn, or Lady. | catalogued / TODO |
| werewolf | werewolf.webp | Оборотень | 3 | - | -3 | - | Нечисть | Places on a peaceful resident. At each Festival, swaps top/bottom with its host. | catalogued / TODO |
| ghost | ghost.webp | Призрак | 3 | - | 0 | - | Нечисть | Places under a peaceful resident. The host becomes Fiend; only All Saints can kill it. | catalogued / TODO |
| hare | hare.webp | Заяц на Лужайке | 1 | - | 0 | - | - | Targets residents with 0 VP first, then the highest-VP resident. | catalogued / TODO |

## Monsters

| ID | Art | Card | Copies | Danger | Ability / priority | Status |
| --- | --- | --- | ---: | ---: | --- | --- |
| basilysk | basilysk.webp | Василиск | 1 | 5 | Eats animals and Midget first, then the highest-VP residents. | catalogued / TODO |
| dragon | dragon.webp | Дракон | 1 | 7 | Eats women and Adaptable first, then the highest-VP residents. | catalogued / TODO |
| giant | giant.webp | Гигант с дубиной | 1 | 4 | Eats Baby and Midget first, then the highest-VP residents. | catalogued / TODO |
| manticore | manticore.webp | Мантикора | 1 | 6 | Eats Crusaders first, then the lowest-VP residents. | catalogued / TODO |
| rusal | rusal.webp | Русал | 1 | 4 | Male Crusaders roll only one die when fighting it. | catalogued / TODO |

## Festivals

| ID | Art | Card | Copies | Effect | Status |
| --- | --- | --- | ---: | --- | --- |
| Carnival | Carnival.webp | Карнавал | 1 | Every player passes one resident to the city on the left. | catalogued / TODO |
| Walpurgis | Walpurgis.webp | Вальпургиева ночь | 1 | Succubi, Witches, Harlots, Possessed, and Duchesses move right; Trolls ignore them. | catalogued / TODO |
| beltain | beltain.webp | Бельтайн | 1 | Every player burns one resident in their city. | catalogued / TODO |
| christmas | christmas.webp | Рождество | 1 | The three Crossroads cards die from cold; refill the Crossroads. | catalogued / TODO |
| fair | fair.webp | Ярмарка | 1 | Kolya, Executioner, Minstrel, Jester, and Troubadour activate again. | catalogued / TODO |
| fish | fish.webp | Четверг | 1 | Reveal one card per player; each player takes and plays one. | catalogued / TODO |
| shabash | shabash.webp | Шабаш | 1 | Succubi, Witches, and Possessed gather in the current player’s city; Trolls ignore them. | catalogued / TODO |
| fullmoon | fullmoon.webp | Полнолуние | 1 | Activate lunar properties, then continue the turn. | catalogued / core loop |
| new_moon | new_moon.webp | Новолуние | 1 | Activate lunar properties, then continue the turn. | catalogued / core loop |
| st_patrick | st_patrick.webp | День святого Патрика | 1 | Festival event; resident-specific effects remain to be implemented. | catalogued / TODO |
| st_valentine | st_valentine.webp | День святого Валентина | 1 | Festival event; resident-specific effects remain to be implemented. | catalogued / TODO |
| tournament | tournament.webp | Турнир | 1 | Festival event that initiates a local Crusade. | catalogued / core loop |
| all_saints | all_saints.webp | День всех святых | 1 | All Ghosts die; this is the only way to kill a Ghost. | catalogued / core loop |

## Cursed relics

| ID | Art | Card | Copies | VP | Ability | Status |
| --- | --- | --- | ---: | ---: | --- | --- |
| nercomicon | nercomicon.webp | Некрономикон | 1 | 3 | When a resident dies, one attempt may be made to roll a 6 and save them. | catalogued / TODO |
| sarchopagus | sarchopagus.webp | Саркофаг | 1 | 2 | Stores dead residents; retrieve one later and play it into your city, ignoring placement restrictions. | catalogued / TODO |
| excalibur | excalibur.webp | Меч в камне | 1 | 4 | At game end, roll for each commoner; the first 6 promotes that commoner to courtier. | catalogued / TODO |
| cursed_mirror | Cursed_Mirror.webp | Проклятое зеркало | 1 | 5 | A resident activates a Crossroads character as if it belonged to that resident. Ghosts and Vurdalaks are excluded. | catalogued / TODO |

## Rules checklist

- [ ] Fiend type: counts as resident, has no estate, cannot Crusade; exceptions are Ghost and Mermaid.
- [ ] Ghost possession and All Saints removal.
- [ ] Werewolf possession and Festival swapping.
- [ ] Monster lairs, hunger growth, movement, and one-combat-per-turn limit.
- [ ] Crusader-versus-Monster combat and monster priority lists.
- [ ] Festival trigger from the moon die starting in round two.
- [ ] Festival deck and All Saints / holiday sequencing.
- [ ] Relic storage, resurrection, and end-game promotion rules.
