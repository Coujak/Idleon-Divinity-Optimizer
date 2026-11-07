# Game model and assumptions

This document records formulas currently implemented in `src/divinity.js`. They are community-researched and must be checked against the live game after updates.

## Coral Kid Divinity Point upgrades

| Index | Upgrade | Base cost | Cost multiplier per level | Divinity unlock |
|---:|---|---:|---:|---:|
| 0 | Volcano Link | 10,000,000 | 1.10 | 0 |
| 1 | Blessing Capacity | 60,000,000 | 1.25 | 600 |
| 2 | God Rank Class EXP | 360,000,000 | 1.10 | 900 |
| 3 | Minor Link Bonus | 2,160,000,000 | 1.10 | 1,200 |
| 4 | Divinity Point Gain | 12,960,000,000 | 1.10 | 1,500 |
| 5 | Daily Coral | 77,760,000,000 | 1.10 | 1,750 |

Base cost follows the previously researched 10M × 6^index sequence. Cost for buying the next level is rounded up from base × rate^current level.

## Coral Kid Singularity Spiral upgrades

| Index | Upgrade | Base cost | Cost multiplier per level | Divinity unlock |
|---:|---|---:|---:|---:|
| 6 | DP Transmutation | 1 | 1.13 | 3,000 |
| 7 | Transmutation Value | 9 | 1.13 | 5,000 |
| 8 | Divinity EXP II | 121 | 1.13 | 8,000 |
| 9 | Time Elapse | 2,197 | 1.13 | 10,000 |
| 10 | Lumi Hourly Gain | 28,561 | 1.85 | 12,000 |
| 11 | God Rank Damage | 759,375 | 1.85 | 12,000 |

## Effect formulas

- 0: 10 × level (% Divinity EXP)
- 1: round(2 × level) Blessing capacity
- 2: level / (25 + level) × 20 (% Class EXP per God Rank)
- 3: level (% Minor Link bonus)
- 4: 2 × level (% Divinity Point gain per Reef upgrade)
- 5: level / (40 + level) × 100 (% Daily Coral)
- 6: 100 × level (% DP transmutation)
- 7: 10 × level (% transmutation value)
- 8: 50 × level (% Divinity EXP)
- 9: round(125 × level / (level + 100)) (% time-elapse effect)
- 10: 5 × level (% Lumi hourly gain)
- 11: level (% damage per God Rank above 25)

## Current limitations

1. The optimizer currently uses a greedy marginal-value-per-cost strategy, not an exhaustive global search.
2. It requires the player to enter baseline upgrade levels manually. JSON import currently inspects the save but does not infer account values.
3. Blessing-cap external bonuses, God Rank offering costs, free-offering chance, and other modifiers are not yet modeled.
4. Some game effects may have rounding or display behavior different from the simplified model above. Treat recommendations as estimates until verified in game.
5. The planner currently shows a basic set of derived metrics; not every Coral Kid effect is represented as a comparable multiplier.
