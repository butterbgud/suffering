# Card Ability Ledger

This table is generated from `/home/clop/citadel/suffering/engine/src/suffering/cards.yaml` on 2026-07-28. Verify the art mapping and values first; once confirmed, this becomes the implementation checklist. `-` means the YAML does not specify a value yet.

## YAML Catalogue (44 Entries)

| YAML key | Art file | Type | Copies | Immunity | VP | Crusade | Ability key | Description |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| resident_battle_horse | warhorse.webp | resident_nobility | 2 | 33 | 2 | 6 | crusade_no_points_if_only_horses | No crusade points if it goes alone. |
| resident_witch | witch.webp | resident_commoner | 2 | 99 | -4 | - | ruler_draws_and_plays_2 | City ruler draws and immediately plays 2 cards. |
| resident_driver | carry.webp | resident_commoner | - | 47 | 2 | 1 | swap_same_estate_between_adjacent_cities | Swap one resident from adjacent cities; they must share an estate. |
| resident_bishop | episcop.webp | resident_clergy | - | 35 | 2 | - | global_crusade | All crusaders go on crusade simultaneously. |
| resident_heretic_naturalist | heretic-science.webp | resident_commoner | 1 | 7 | 4 | - | move_resident_to_other_city_with_epidemic | Move a resident to another city; an epidemic travels with them. |
| resident_heretic_necromancer | heretic-necro.webp | resident_commoner | 1 | 7 | 4 | - | discard_1_to_play_resident_from_top5_discard | Discard 1 card to play a resident from the top 5 discard cards. |
| resident_heretic_alchemist | heretic-alch.webp | resident_commoner | 1 | 7 | 4 | - | destroy_resident_gain_crusade_equal_to_vp | Destroy a resident; gain their VP as crusade points. |
| resident_inquisitor | inquisitor.webp | resident_clergy | - | 41 | 2 | - | kill_any_resident_draw_if_heretic | Kill any resident; reactivate a heretic ability if one was killed. |
| resident_kolya | kolya.webp | resident_commoner | 1 | 32 | -1 | - | TODO_kolya | Lures one woman from each adjacent city. |
| resident_peasant | peasant.webp | resident_commoner | 7 | 6 | 2 | - | peasants_die_together | +1 VP per other peasant; all peasants die from an epidemic together. |
| resident_lady | lady.webp | resident_nobility | 2 | 5 | 1 | - | send_adjacent_knight_to_crusade_gain_points | Sends an adjacent knight on crusade; points go to the Lady. |
| resident_lord | lord.webp | resident_nobility | 2 | 29 | 6 | 3 | self_play_requires_discard | Discard a card to play into own city; otherwise play only in another city. |
| resident_minstrel | troubadur.webp | resident_commoner | 2 | 45 | 1 | 2 | steal_up_to_3_crusade_points | Steal up to 3 crusade points from another city. |
| resident_baby | baby.webp | resident_misc | 3 | - | 3 | - | kill_lady_or_harlot_on_entry | On entry, discard a Lady or Harlot here. Dies first from every disease. |
| resident_monk | monk.webp | resident_clergy | 4 | 25 | 3 | - | monk_group_scoring_penalty | Loses 2 VP for each other Monk in the city. |
| resident_squire | weapon_bearer.webp | resident_nobility | 2 | 67 | 2 | 3 | substitute_for_knight | Can die or crusade instead of a Knight. |
| resident_executioner | executioner.webp | resident_commoner | 2 | 61 | -2 | 2 | kill_courtier_then_lure_commoners | Kill a courtier here, then lure commoners from adjacent cities. |
| resident_leper | leper.webp | resident_commoner | 1 | - | 1 | - | counts_as_resident_epidemic_still_moves | Does not die from epidemics. |
| resident_preacher | preacher.webp | resident_clergy | - | - | - | - | local_crusade | All crusaders in this city go on crusade. |
| resident_bandit | burglar.webp | resident_commoner | 2 | 55 | -2 | -1 | self_only_kill_courtier_in_other_city | Own city only; kills a courtier in another city. |
| resident_harlot | whore.webp | resident_commoner | 2 | 69 | 1 | - | replace_another_woman_in_this_city | Discard another woman here and replace her with the Harlot. |
| resident_recruiter | recruit.webp | resident_commoner | 2 | 31 | 2 | 3 | send_peaceful_residents_to_crusade | Sends selected non-crusader residents on crusade using VP as crusade points. |
| resident_knight | knight.webp | resident_nobility | 3 | 65 | 5 | 5 | self_play_requires_discard | Discard a card to play into own city; otherwise play only in another city. |
| resident_guard | guard.webp | resident_commoner | 2 | 39 | 3 | 2 | imprison_top_deck_card_until_guard_leaves | Imprisons the top deck card until the Guard leaves. |
| resident_trader | merchant.webp | resident_commoner | 2 | 53 | 3 | - | trader_scores_zero_if_multiple | Scores zero if the city has more than one Trader. |
| resident_innkeeper | innkeeper.webp | resident_commoner | 2 | 57 | 2 | - | place_top_deck_card_here_without_enter_effect | Places top deck card here without its instant effect. |
| resident_fanatic | fanatic.webp | resident_commoner | 2 | - | -2 | 3 | lure_adjacent_commoner_crusader | Lures an adjacent commoner crusader. |
| resident_plague_doctor | plague_doc.webp | resident_clergy | 5 | 91 | -2 | - | cure_one_epidemic_in_city | Removes one epidemic from this city. |
| resident_jester | jester.webp | resident_nobility | 1 | 87 | 2 | - | copy_crossroads_instant_ability | Copies an instant ability from a Crossroads card. |
| epidemic_cholera | cholera.webp | epidemic | 1 | - | - | - | epidemic_prioritize_commoners | Kills commoners first, then by normal immunity. |
| epidemic_leprosy | leprosy.webp | epidemic | 1 | - | - | - | epidemic_prioritize_clergy | Kills clergy first, then by normal immunity. |
| epidemic_malaria | malaria.webp | epidemic | 1 | - | - | - | epidemic_prioritize_courtiers | Kills courtiers first, then by normal immunity. |
| epidemic_smallpox | black_pox.webp | epidemic | 1 | - | - | - | epidemic_kill_highest_immunity_first | Kills highest-immunity residents first. |
| epidemic_bubonic_plague | bubonic_plague.webp | epidemic | 1 | - | - | - | epidemic_double_kill_first_tick | Kills 2 residents on its first tick. |
| resident_adaptable | adaptable.webp | resident_commoner | 1 | 88 | 2 | - | todo_adaptable | On moving to another city, gains 1 VP and moves up an estate. |
| resident_troubadur | troubadur.webp | resident_commoner | 1 | 46 | -1 | - | todo_bard | Steals 1 crusade point from each city. |
| resident_cat | cat.webp | resident_misc | 1 | 73 | 2 | - | todo_cat | Saves one resident from an epidemic and discards itself instead. |
| resident_corpse | corpse.webp | resident_misc | - | - | 0 | - | todo_corpse | Cannot be killed or crusaded; can be moved or burned. |
| resident_crossbowman | crossbowman.webp | resident_commoner | 2 | 49 | 2 | 3 | todo_crossbowman | Shoots a character on the Crossroads. |
| resident_cupbearer | cupbearer.webp | resident_commoner | 2 | 89 | 1 | 2 | todo_cupbearer | Swaps a courtier here for a commoner from another city. |
| resident_devka | devka.webp | resident_commoner | - | 69 | 2 | -1 | lures_monk_from_another_city | Lures a Monk from another city. |
| resident_hare | hare.webp | resident_misc | 1 | 72 | -1 | - | trade_any_resident_for_resident_from_crossroad | Trades any city resident for a Crossroads resident. |
| resident_midget | midget.webp | resident_commoner | 1 | 8 | 1 | - | todo_midget | Does not count as a person; follows any resident moved from its city. |
| resident_virgin | virgin.webp | resident_commoner | 1 | 21 | 1 | 1 | todo_virgin | On crusading, replace with the first male from the deck. |

## Art Without YAML Entry

These faces exist in `public/assets/cards` but are not part of the current YAML catalogue. Add their data to `cards.yaml` when ready.

- `bard.webp`
- `deserter.webp`
- `devil.webp`
- `hermit.webp`
- `mutilator.webp`
- `possesed.webp`
- `priest.webp`
- `standard_bearer.webp`
- `syphilis.webp`
- `templar.webp`

## Non-deck Art

- `*-start.webp`: epidemic-origin tokens.
- `hg1.webp`, `hg2.webp`, `hg3.webp`: relic art; ownership is shown in the player city.
