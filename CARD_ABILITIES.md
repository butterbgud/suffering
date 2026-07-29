# Card Ability Ledger

This table is the processed implementation catalogue. It combines the original [`cards.yaml`](cards.yaml) with the verified additions below it, and is the checklist for card data and abilities. `-` means the card has no value in that field.

## Processed Catalogue (53 Faces)

| YAML key | Art file | Type | Copies | Immunity | VP | Crusade | Ability key | Description |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| resident_battle_horse | warhorse.webp | resident_nobility | 3 | 33 | 2 | 6 | crusade_no_points_if_only_horses | No crusade points if it goes alone. |
| resident_witch | witch.webp | resident_commoner | 2 | 99 | -4 | - | ruler_draws_and_plays_2 | The owner of the city she was played into, draws and immediately plays 2 cards. |
| resident_driver | carry.webp | resident_commoner | 3 | 47 | 2 | 1 | swap_same_estate_between_adjacent_cities | Swap same class resident from adjacent cities, players choice |
| resident_bishop | episcop.webp | resident_clergy | 4 | 35 | 2 | - | global_crusade | All crusaders go on crusade simultaneously. |
| resident_heretic_naturalist | heretic-science.webp | resident_commoner | 1 | 7 | 4 | - | move_resident_to_other_city_with_epidemic | Move a resident to another city; an epidemic travels with them. |
| resident_heretic_necromancer | heretic-necro.webp | resident_commoner | 1 | 7 | 4 | - | discard_1_to_play_resident_from_top5_discard | Discard 1 card to play a resident from the top 5 discard cards. |
| resident_heretic_alchemist | heretic-alch.webp | resident_commoner | 1 | 7 | 4 | - | destroy_resident_gain_crusade_equal_to_vp | Destroy a resident; gain their VP as crusade points. |
| resident_inquisitor | inquisitor.webp | resident_clergy | 6 | 41 | 2 | - | kill_any_resident_draw_if_heretic | Kill any resident; Draw a card if heretic was killed. |
| resident_kolya | kolya.webp | resident_commoner | 1 | 32 | -1 | - | TODO_kolya | Lures one woman from each adjacent city. |
| resident_peasant | peasant.webp | resident_commoner | 7 | 6 | 2 | - | peasants_die_together | +1 VP per other peasant; all peasants die from an epidemic together. |
| resident_lady | lady.webp | resident_nobility | 2 | 5 | 1 | - | send_adjacent_knight_to_crusade_gain_points | Sends an adjacent knight on crusade; points go to the Lady. |
| resident_lord | lord.webp | resident_nobility | 3 | 29 | 6 | 3 | self_play_requires_discard | Discard a card to play into own city; otherwise play only in another city. |
| resident_minstrel | bard.webp | resident_commoner | 2 | 45 | 1 | 2 | steal_up_to_3_crusade_points | Steal up to 3 crusade points from another city. |
| resident_baby | baby.webp | resident_misc | 2 | - | 3 | - | kill_lady_or_harlot_on_entry | On entry, discard a Lady or Harlot here. Dies first from every disease. |
| resident_monk | monk.webp | resident_clergy | 4 | 25 | 3 | - | monk_group_scoring_penalty | Loses 2 VP for each other Monk in the city. |
| resident_squire | weapon_bearer.webp | resident_nobility | 2 | 67 | 2 | 3 | substitute_for_knight | When knight alone must go on a crusade or die, weapon bearer can do that instead. |
| resident_executioner | executioner.webp | resident_commoner | 2 | 61 | -2 | 2 | kill_courtier_then_lure_commoners | Kill a  resident_nobility in the city where its played, then lure commoner from each adjacent city. (players choice) |
| resident_leper | leper.webp | resident_commoner | 1 | - | 1 | - | counts_as_resident_epidemic_still_moves | Does not die from epidemics. |
| resident_preacher | preacher.webp | resident_clergy | 4 | 23 | 1 | - | local_crusade | All crusaders in this city go on crusade. |
| resident_bandit | burglar.webp | resident_commoner | 2 | 55 | -2 | -1 | self_only_kill_courtier_in_other_city | Can only be played into your city; kills a resident_nobility in another city.(players choice) |
| resident_harlot | whore.webp | resident | 2 | 69 | 2 | -1 | lure_monk_from_other_city | Lures a Monk from another city into the Harlot's city. |
| resident_recruiter | recruit.webp | resident_commoner | 4 | 31 | 2 | 3 | send_peaceful_residents_to_crusade | Sends selected non-crusader residents on crusade using VP as crusade points. |
| resident_knight | knight.webp | resident_nobility | 3 | 65 | 5 | 5 | self_play_requires_discard | Discard a card to play into own city; otherwise play only in another city. |
| resident_guard | guard.webp | resident_commoner | 2 | 39 | 3 | 2 | imprison_top_deck_card_until_guard_leaves | Imprisons the top deck card until the Guard leaves. |
| resident_trader | merchant.webp | resident_commoner | 3 | 53 | 3 | - | trader_scores_zero_if_multiple | Scores zero if the city has more than one Trader. |
| resident_innkeeper | innkeeper.webp | resident_commoner | 2 | 57 | 2 | - | place_top_deck_card_here_without_enter_effect | Places top deck card in this city without its instant effect. |
| resident_fanatic | fanatic.webp | resident_commoner | 2 | - | -2 | 3 | lure_adjacent_commoner_crusader | Lures an adjacent commoner crusader. |
| resident_plague_doctor | plague_doc.webp | resident_clergy | 9 | 91 | -2 | - | cure_one_epidemic_in_city | Removes one epidemic from this city. |
| resident_jester | jester.webp | resident_nobility | 2 | 87 | 2 | - | copy_crossroads_instant_ability | Copies an instant ability from a Crossroads card. |
| epidemic_cholera | cholera.webp | epidemic | 1 | - | - | - | epidemic_prioritize_commoners | Kills commoners first, then by normal immunity. |
| epidemic_leprosy | leprosy.webp | epidemic | 1 | - | - | - | epidemic_prioritize_clergy | Kills clergy first, then by normal immunity. |
| epidemic_malaria | malaria.webp | epidemic | 1 | - | - | - | epidemic_prioritize_courtiers | Kills courtiers first, then by normal immunity. |
| epidemic_smallpox | black_pox.webp | epidemic | 1 | - | - | - | epidemic_kill_highest_immunity_first | Kills highest-immunity residents first. |
| epidemic_bubonic_plague | bubonic_plague.webp | epidemic | 1 | - | - | - | epidemic_double_kill_first_tick | Kills 2 residents on its first tick. |
| resident_adaptable | adaptable.webp | resident_commoner | 1 | 88 | 2 | - | todo_adaptable | On moving to another city, gains 1 VP and moves up an estate. |
| resident_troubadur | troubadur.webp | resident_commoner | 2 | 46 | -1 | - | todo_bard | Steals 1 crusade point from each city. |
| resident_cat | cat.webp | resident_misc | 1 | 73 | 2 | - | todo_cat | Saves one resident from an epidemic and discards itself instead. |
| resident_corpse | corpse.webp | resident_misc | - | - | 0 | - | todo_corpse | Cannot be killed or crusaded; can be moved or burned. |
| resident_crossbowman | crossbowman.webp | resident_commoner | 2 | 49 | 2 | 3 | todo_crossbowman | Shoots a character on the Crossroads. that character is discarded |
| resident_cupbearer | cupbearer.webp | resident_commoner | 2 | 89 | 1 | 2 | todo_cupbearer | Swaps a nobility in this city for a commoner from another city.(players choice) |
| resident_devka | devka.webp | resident | 3 | 69 | 2 | -1 | todo_devka | Lures a Monk from another city. |
| resident_hare | hare.webp | resident | 1 | 72 | -1 | - | todo_hare | Trades any city resident for a Crossroads resident. |
| resident_midget | midget.webp | resident_commoner | 1 | 8 | 1 | - | todo_midget | Does not count as a person; follows any resident moved from its city. |
| resident_virgin | virgin.webp | resident_commoner | 1 | 21 | 1 | 1 | todo_virgin | On crusading, replace with the first male from the deck. |
| resident_deserter | deserter.webp | resident_nobility | 2 | 51 | 2 | -1 | return_to_city_on_right_after_crusade | When crusading, does not go to discard; appears in the city to the right. |
| resident_devil | devil.webp | resident_nobility | 1 | 96 | 0 | - | devil_scores_for_negative_vp | Gets +2 VP for each resident with negative VP. |
| resident_hermit | hermit.webp | resident_clergy | 1 | 13 | 9 | - | hermit_group_scoring_penalty | Loses 1 VP for each other resident in the city. |
| resident_mutilator | mutilator.webp | resident_nobility | 1 | 28 | 3 | - | move_when_woman_enters_city | If a woman appears in this city, moves to the next city without a woman; otherwise discards. |
| resident_possesed | possesed.webp | resident_clergy | 2 | 56 | -2 | - | repeat_other_local_instant_ability | Activates another resident's instant ability in this city once more. |
| resident_priest | priest.webp | resident_clergy | 2 | 86 | 2 | - | draw_and_crusade_or_discard | Draws a deck card: crusader goes immediately on crusade; otherwise discard it. |
| resident_standard_bearer | standard_bearer.webp | resident_nobility | 2 | 59 | 1 | - | standard_bearer_crusade_bonus | Gets +1 crusade point for each other resident that goes with him. |
| resident_templar | templar.webp | resident_clergy | 2 | 22 | 1 | 5 | templar_stays_with_woman_or_adaptable | Does not go on crusade if the city contains a woman or Adaptable resident. |
| epidemic_syphilis | syphilis.webp | epidemic | 1 | - | - | - | epidemic_syphilis | If the starting city has Devka or Harlot, begins killing 2. |

## Processed Catalogue Coverage

All playable card faces are now listed above. The only non-deck faces are `*-start.webp` epidemic-origin tokens and `hg1.webp`–`hg3.webp` relic art.

## Non-deck Art

- `*-start.webp`: epidemic-origin tokens.
- `hg1.webp`, `hg2.webp`, `hg3.webp`: relic art; ownership is shown in the player city.
