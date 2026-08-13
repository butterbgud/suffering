# Feasts and Monsters — Card Ability Ledger

This is the expansion catalogue and implementation checklist. It is intentionally separate from `CARD_ABILITIES.md` so the original game can be verified independently.

`Copies` is the current temporary deck count. Replace it when the physical card count is confirmed. `Status` tracks implementation: `catalogued` means the card is represented in the deck, while `TODO` means its rules still need engine work.

## Fiends and residents

| ID | Art | Card | Copies | VP | Ability | Status |
| --- | --- | --- | ---: | ---: | --- | --- |
| demon_herecy | demon_herecy.webp | Демон Ереси | 1 | 0 | +1 VP per negative resident and per Inquisitor, Pastor, or Preacher in this city. | catalogued / TODO |
| demon_lust | demon_lust.webp | Демон Похоти | 1 | 0 | +1 VP per negative resident, woman, Succubus, and Adaptable in this city. | catalogued / TODO |
| demon_party | demon_party.webp | Демон Кутежа | 1 | 0 | +1 VP per negative resident and per Fiend in this city; counts itself as Fiend. | catalogued / TODO |
| duchess | duchess.webp | Графиня | 1 | 4 | Lures a male commoner from an adjacent city and makes him a courtier. | catalogued / TODO |
| lady_virgin | lady_virgin.webp | Девственница | 1 | 5 | Activates one resident’s instant ability in this city; cannot become Fiend. | catalogued / TODO |
| leprechaun | leprechaun.webp | Лепрекон | 1 | 4 | Gives 2 points and forces a discard. | catalogued / TODO |
| leshiy | leshiy.webp | Леший | 1 | 0 | Moves a Crossroads resident to an adjacent city; that resident’s instant ability does not activate. | catalogued / TODO |
| mermaid | mermaid.webp | Утопленница | 1 | 0 | Cannot be killed, only burned. Moves right with one chosen resident. | catalogued / TODO |
| nunn | nunn.webp | Монахиня | 1 | 4 | Drives one Fiend away. | catalogued / TODO |
| succub | succub.webp | Суккуб | 1 | 4 | Searches until the first man or Monster, puts it in this city, then kills a man here. | catalogued / TODO |
| troll | troll.webp | Тролль | 1 | 0 | Attacks residents moving across its chosen city boundary; on 4–6 they are discarded. | catalogued / TODO |
| unicorn | unicorn.webp | Единорог | 1 | 4 | Moves any resident to an adjacent city and activates its ability. | catalogued / TODO |
| vurdalak2 | vurdalak2.webp | Вурдалак | 1 | 0 | Replaces a peaceful man; then moves toward a city containing Baby, Virgin, Nunn, or Lady. | catalogued / TODO |
| werewolf | werewolf.webp | Оборотень | 1 | -3 | Places on a peaceful resident. At each Festival, swaps top/bottom with its host. | catalogued / TODO |
| ghost | ghost.webp | Призрак | 1 | 0 | Places under a peaceful resident. The host becomes Fiend; only All Saints can kill it. | catalogued / TODO |
| hare | hare.webp | Заяц на Лужайке | 1 | 0 | Targets residents with 0 VP first, then the highest-VP resident. | catalogued / TODO |

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
| Cursed Mirror | Cursed Mirror.webp | Проклятое зеркало | 1 | A resident activates a Crossroads character as if it belonged to that resident. Ghosts and Vurdalaks are excluded. | catalogued / TODO |

## Cursed relics

| ID | Art | Card | Copies | VP | Ability | Status |
| --- | --- | --- | ---: | ---: | --- | --- |
| nercomicon | nercomicon.webp | Некрономикон | 1 | 3 | When a resident dies, one attempt may be made to roll a 6 and save them. | catalogued / TODO |
| sarchopagus | sarchopagus.webp | Саркофаг | 1 | 2 | Stores dead residents; retrieve one later and play it into your city, ignoring placement restrictions. | catalogued / TODO |
| excalibur | excalibur.webp | Меч в камне | 1 | 4 | At game end, roll for each commoner; the first 6 promotes that commoner to courtier. | catalogued / TODO |

## Rules checklist

- [ ] Fiend type: counts as resident, has no estate, cannot Crusade; exceptions are Ghost and Mermaid.
- [ ] Ghost possession and All Saints removal.
- [ ] Werewolf possession and Festival swapping.
- [ ] Monster lairs, hunger growth, movement, and one-combat-per-turn limit.
- [ ] Crusader-versus-Monster combat and monster priority lists.
- [ ] Festival trigger from the moon die starting in round two.
- [ ] Festival deck and All Saints / holiday sequencing.
- [ ] Relic storage, resurrection, and end-game promotion rules.
