# Bladder Brawl difficulty

Measured with the built-in headless sim (`?sim`, `SIM.run(level, upgrades, skill, seed)`): a bot with
aim noise of (1-skill)×90 px and reaction lag of 0.15+(1-skill)×0.6 s plays every level 6 times
while buying the cheapest upgrade it can afford after each level (a frugal career; real players can replay for coins).

Win rate % per level (L1 to L18):

```
casual (.35): 100 83 100 100 83 33 100 100 50 83 33 33 83 50 16 83 83 0
average(.60): 100 100 100 100 100 66 100 100 100 100 100 100 100 100 66 100 100 16
skilled(.85): 100 100 100 100 100 83 100 100 100 100 100 100 100 100 100 100 100 83
```

- L1 to L5 are onboarding (one new bug type per level).
- Boss levels (6, 12, 18) are deliberate spikes; L15 is the pre-final exam.
- Base ramp: count 8+1.8·L, HP ×(1+0.17·(L-1)), speed ×(1+0.045·(L-1)), spawn gap shrinks 0.13 s per level, plus a per-level multiplier table `DMT` in `game.js`.

## Art overhaul (Oct 2026)
Bowl wall curve changed to match the generated bowl sprite: `wallL = 24 + 190·max(0,t−.35)²` (was `34 + 52·t²`).
Re-run of the bot sim (6 runs/level, % wins) stays within sampling noise of the previous table:
```
0.35 100 83 100 100 83 16 100 100 66 66 50 0 83 83 33 83 83 0
0.6  100 100 100 100 100 83 100 100 100 100 100 100 83 100 100 100 100 16
0.85 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100
```

## v3 first-person urinal (Oct 2026)
Play area is now the interior of a wall urinal seen from above/behind. Geometry is derived from the urinal sprite:
rim (escape line) at 8% of urinal height, bugs spawn at 83% (around the drain), `wallL = Ux + Uw·(.125 + .21·u³)`, u = max(0,(t−.55)/.45).
The stream enters from the bottom edge (between the player's sneakers); drop flight time ignores the off-screen segment
below the urinal so lag matches v2. Side events (phone, door, fly target, beer can, splashed kicks, golden roach) are
presentation/bonus only and are disabled in `?sim`. Bot sim re-run (6 runs/level, % wins):
```
0.35 100 100 100 100 83 16 100 100 100 83 33 16 83 100 33 83 33 0
0.6  100 100 100 100 100 100 100 100 100 100 100 100 100 100 83 100 100 0
0.85 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100
```

## v4 stream from above (Oct 2026)
The stream now falls from the player above the camera (origin off the top edge, sways with aim) on an accelerating arc
to the aimed point. Reach and flight time still use a virtual launch point at the bowl bottom, so aim lag matches v2.
Final boss MAMA LEGS: hp 1900 -> 1550, baby-spawn interval 2.8 s -> 3.3 s, babies clamped inside the urinal walls.
```
0.35 100 100 100 100 83 0 100 100 66 83 0 0 50 100 33 83 33 0
0.6  100 100 100 100 100 83 100 100 83 100 100 100 100 100 100 100 100 33
0.85 100 100 100 100 100 83 100 100 100 100 100 100 100 100 100 100 100 66
```

## v5 — painted plate, flat stream, fan wash, ash can, hand flush (2026-10-25)

Geometry now comes from one painted plate (`art/plate5`, 720×1280, cover-fit). The interior contour was measured in plate pixels:
top edge y=515, rounded corners r=52, straight walls x=168/558 down to y=860, then a half-ellipse floor to y=1095. The drain is at (356,969).
The bowl is ~23% shorter in logical units than v4, so all bug speeds, knockback, spawn offsets and stream hit radius are multiplied by
`L.K = wallH/496`, which makes travel times and hit areas match v4. Spawns moved up to y=1025 so groups do not stack in the narrow floor.

- **Stream:** a flat, constant-width line (purely visual change).
- **Fan wash:** every impact also hits bugs inside an irregular fan.
  - The apex is the impact point and the fan opens down the wall, skewed by aim and the wall's curvature, and bends to the drain low down.
  - Length is (112+12·wid)·K and the half-angle is .72+.05·wid rad.
  - Damage is `dmg·0.30·(1−r/len)` and knockback `kb·0.30·(1−r/len)`, on top of the full direct hit inside `rad`.
- **Early call (ash can):**
  - When no live bugs remain and the next group is more than 1.4s away, tap the can (or press C).
  - The rest of the queue is pulled forward to spawn 0.9s later, and you get a bonus of max(2, round(3·(gap−0.9))) coins.
  - A hand shakes the can's ash and butts into the bowl, so non-boss bugs move 32% slower for 7s.
  - The sim bot calls with probability skill·0.5 per decision. Calls mostly happen on L1–L3 and for strong players, which is intended.
- **Flush:** the kill front follows the rim water: it starts 0.34s after the press and sweeps down in about 1.05s. Bugs stay frozen until t=1.8s (was 1.3s).
- **Retune:** DMT L10 .85→.75, L11 .85→.8, L13 1.1→.95, L14 1→.85; MAMA LEGS hp 1550→1700.

Sim win % per level (6 seeds, bot buys upgrades), `_work/sim.py`:

```
0.35 100 83 100 100 66 0 100 100 50 50 0 0 50 50 0 33 66 0
0.6  100 100 100 100 100 83 100 100 100 100 100 100 100 83 100 100 100 83
0.85 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100
```
Compared with v4:
- Low skill is in the same band (gated by coins, with boss walls at L6, L12 and L18).
- Mid skill is a little easier: the wash rewards sweeping clusters.
- The final boss still costs a mid-skill bot about one run in six.

## v5b (flush sheets + larger fan wash)
- Flush: clear water sheets run from the inlet round the inner rim and down both walls (width 9->45 plate px), converging on the drain. Bugs touched by a sheet (or in the drain swirl) are washed out; bosses take 12% once. Untouched bugs are frozen until t=1.8s and nudged down (kb 110*K).
- Fan wash: length (178+16*wid)*K, half-angle .86+.05*wid rad; WASH multiplier lowered .30 -> .12 (linear falloff from the impact point) to offset the larger area. Direct hit still deals full damage.
- Sim (6 seeds, greedy upgrades): skill .35 wins most early/mid levels, loses L6/L18; .6 and .85 clear everything.

## v5c (urinal fitted up, sneakers below the lip)
- Layout fits the urinal, not the plate: flushometer just under the HUD, bottom lip at ~83% of the screen; plate scale 0.70 at 390x844 (v5: 0.677), 0.57 at 375x667 (v5: 0.556). All bowl geometry scales with L.K, so travel times are unchanged.
- Sim (6 seeds): .35 433311-tier, wins early levels, struggles L9+ ; .6 clears all but one seed on L14; .85 clears everything. No retune needed.

## v5d
- Lip at 0.9H (bowl ~9% larger at 390x844). Toe caps only (toe5, procedural raymarch), under lip layer.
- Liquid stream (layered edge/body/core, necking, Plateau-Rayleigh beads on long streams); wedge impact fan. Damage logic unchanged.
- Sim: 0.35 skill slightly harder; 0.6 L14 66 / L18 50; 0.85 L14 83. No retune.

## v5e
- Painted assets: toe5 (sneaker toe boxes), stream5 (liquid strip, UV-scrolled, sheared straight from top edge to impact), fan5 (4-variant splash sheet, rotated to wash dir), flush sheets textured with desaturated stream5. Visual only; damage/balance unchanged.

## v5f
- Stream: continuous glassy column (gradient body, twisting edge highlights, scrolled texture ripples), drawn behind rim props above the bowl top.
- Impact: crown sprite at apex + translucent sheet flowing downhill + rivulets to drain + multiply wet decal. Damage zones unchanged.
- Toe caps: per-foot painted front-facing toe boxes (toeL5/toeR5), darker in lip shadow. Phone lies flat on the top deck; can + phone reseated on the deck with contact shadows. Visual only.

## v5g
- Flush redone: full-bowl water sheet (front sweeps rimY->drain in ~0.9 s, tail drains 1.3-2.05 s, swirl, wet sheen until 3.2 s). Every non-boss bug between the tail and the front is washed (previously only bugs touching the wall sheets). Bosses still take 12% once. Sim: skill .35 wins rose slightly on L9/L13/L14 (0->33, 50->66, 16->33); .6/.85 unchanged.
- Perf: adaptive DPR, cached lip/stains, per-frame stream buffer cache, pre-decoded art.

## v6 3D fluid stream (Oct 2026)
The 2D drop stream + impact fan wash are replaced by the 3D particle jet (`fluid.js`). Damage now comes from particle hits
on each bug (bugs are projected onto the porcelain cavity as spheres of radius `bug.r + 0.5·rad·K`):

- hit units per particle = 0.16·(−v·n + 0.3·|v|) × (1.0 direct jet, 0.35 splash droplet, 0.12 second bounce)
- damage per unit = `dps · FXK / (rate·1.3·0.6)` → independent of the quality tier's particle rate
- knockback = damage × 6·kb/dps × `FXKB`
- boss multipliers: Baron Blowfly ×1, General Goo ×1.5, Mama Legs ×4.4 (the old wash fan used to hit her minions and her at the same time; one focused jet can't)
- Flush: normal bugs washed into the drain, bosses keep the old 12% rule (unchanged). The stream pauses while the sheet runs.

Tuned constants (`?fxk= ?fxkb= ?fxb= ?fxs=` override them for testing): **FXK 1.4, FXKB 1.5, FXB 1, FXS 4.4**.
Measured with `_work/sim6.py` (real fluid physics inside `?sim&fxsim&q=1`, 8 seeds/level, same greedy upgrade path as 2D):

```
before (v5g 2D, 8 seeds)
0.35 100 87 100 100 75 0 100 100 50 87 25 12 50 62 0 25 62 0      avg 57%
0.6  100 100 100 100 100 87 100 100 87 100 100 100 100 50 50 100 100 75   avg 94%
0.85 100 ×18                                                          avg 100%
after (v6 fluid, FXK 1.4)
0.35 100 100 87 100 37 25 100 87 12 100 87 12 12 25 62 62 62 12   avg 60%
0.6  100 100 100 100 100 87 100 100 100 100 100 100 100 75 100 75 100 50  avg 94%
0.85 100 100 100 100 100 100 100 100 100 100 100 100 100 87 100 87 100 87 avg 98%
```
Same overall curve. Per-level shifts beyond noise: L5/L13 are a bit harder for casual aim (the jet needs to actually be on
the bug; there is no wide fan any more), L11/L15 a bit easier; the final boss is slightly harder for average players (50% vs 75%).
The plain `?sim` (no `fxsim`) still uses the v5g 2D model and is what the WebGL-less fallback plays.

## v6.1 harder (Oct 2026, phone playtest: "过关太容易了")
Humans with the Pad aim and the full-bowl flush cleared levels far more easily than the bots suggested, so difficulty goes up.
URL overrides for testing: `?hpa= ?hpb= ?spb= ?hpboss= ?hpfin= ?flw=`.

- Normal levels: bug HP × (1 + **HPB 0.25**·(L−1)/17), so L1 is unchanged and L17 has +24% HP. Speed is unchanged (**SPB 0**; speed ramps crushed the late levels in the sim).
- Flush: a normal bug is washed into the drain only if it is already below **FLW 60%** of max HP. Healthier bugs take 60% of max HP and get shoved instead. The boss rule (12% once) is unchanged.
- Boss levels L6/L12 are unchanged (HPBOSS 1). On the final level (L18, Mama Legs) HP is ×**0.92**. Players now reach L18 with fewer upgrades, because the harder mid-levels earn fewer coins, so her raw HP needed a small cut to land at the target.

Sim (`_work/sim6.py`, real fluid, 8 seeds/level, greedy upgrade path):
```
            win% per level L1..L18                                          avg
v5g 2D .35  100 87 100 100 75 0 100 100 50 87 25 12 50 62 0 25 62 0          57
v6     .35  100 100 87 100 37 25 100 87 12 100 87 12 12 25 62 62 62 12       60
v6.1   .35  100 100 87 100 0 0 100 62 0 62 50 50 0 0 0 0 37 12              42
v5g 2D .6   (see v6)                                                          94
v6     .6                                                                     94
v6.1   .6   100 100 100 100 100 100 100 100 62 100 100 100 100 62 100 50 100 87   92
v6     .85                                                                    98
v6.1   .85  100 ×15, 62 (L16), 100, 87                                        97
```
- Final boss, average player (0.6), 28 seeds: **35%** (v6: 50%, v5g: 75%). The 8-seed table above shows 87% for L18, which is seed noise: L18 is very path-dependent.
- Early levels (L1–L4) are still ~100% even for casual aim. L5 (first gecko wave), L9 and L13–L16 are now the walls for casual players.
- Skilled stays ~97% in the sim. The 0.85 bot aims almost perfectly, so the human gap is larger than the bot gap. If phone tests still feel easy, raise HPB next (0.35 gave casual 37 / average 85 in the sim).

## v6.2 — three difficulty tiers

Picker on the title screen (and in the pause menu, which restarts the level). Saved in localStorage (`S.diff`, default **REGULAR / Normal**). Stars and unlock progress are kept per tier (`S.sd`, `S.ud`); coins and upgrades are shared. Old v6.1 saves migrate into EASY. HUD and pause subtitle show the tier. All knobs live in `DIFFS` in game.js; sim/tuning override with `?diff=<tier>&d_<key>=<v>`. The 2D fallback uses the same game.js rules.

| knob | PEE-WEE (Easy) = v6.1 | REGULAR (Normal) | IRON BLADDER (Hard) |
|---|---|---|---|
| flat HP bonus (hpa) | 0 | +10% | +30% |
| HP ramp at L17 (hpb) | +25% | +45% | +65% |
| speed ramp at L17 (spb, final fspb) | 0 / 0 | +8% / +8% | +16% / 0 |
| spawn count (n) | ×1 | ×1.1 | ×1.25 |
| spawn gap (gap) | ×1 | ×0.9 | ×0.8 |
| bladder cap / refill | ×1 / ×1 | ×0.9 / ×0.88 | ×0.85 / ×0.75 |
| flushes per level | 2+upg | 2+upg | 2+upg |
| flush wash threshold (flw) | 60% maxHP | 50% | 35% |
| stream damage incl. splash/bounce (dmg) | ×1 | ×1 | ×0.85 |
| boss HP (L6/L12) | ×1 | ×1.1 | ×1.3 |
| final boss HP (L18) | ×0.92 | ×0.85 | ×0.68 (offsets weaker gun / fewer upgrades) |
| coins earned | ×1 | ×1 | ×0.75 |

Sim, real fluid, 28 seeds, greedy upgrade path per tier (overall win % over 18 levels; final = L18):

| tier | casual .35 | average .6 | skilled .85 | L18 average | L18 skilled |
|---|---|---|---|---|---|
| Easy (v6.1) | 42* | 92* | 97* | 35 | — |
| Normal | 26 | 72 | 97 | 21 | 89 |
| Hard | 8 | 26 | 57 | 7 | 10 (28 in a separate L18-only 28-seed run) |

\*v6.1 table (8 seeds), same code path.

- Normal walls: L5 (casual), L9, L13–L18 (average).
- Hard walls: L5 for casual, L9/L13/L15–L17 for everyone.
- The skilled bot aims almost perfectly, so real skilled humans will sit below it.
- Hard's average result (26) is a bit under the 30–40 target. That's deliberate, leaning harder. If phones say it's too brutal, raise hard `dmg` to .9 first.

## v7 — "still too easy": harder, more varied

### Why the sims overestimated difficulty
- **The bot was not human-like.** The v6 bot re-rolled its aim error every time it switched target, so the errors averaged out. With skill it was almost perfect, and it reacted instantly. Its numbers mostly measured the HP-vs-DPS race, not the player.
- **The game asked very little of a human.** Bugs were passive, slow climbers (about 10 s to the rim) with no attacks or obstacles. You had 5 hearts, short levels and 2 near-full-wipe flushes, and the tank almost never ran dry. A continuous jet with visual feedback plus pad aim let a person simply hold the stream on target.
- **Check:** with the new human-like bot, v6.2 Normal comes out at 45 / 78 / **95%** (casual / average / skilled). The old curve really was easy, and skill barely mattered.

### New human-like bot (game.js BOT)
- **Perception:** samples the bowl every 0.12–0.47 s and sees stale positions in between.
- **Reaction:** 0.2–0.55 s delay to switch targets.
- **Finger:** moves at a finite speed (350–950 px/s).
- **Aim:** drifts smoothly (OU noise, amplitude 8–44 px) instead of being re-rolled.
- **Visibility:** darkness, gunk and webs make it worse.
- **Priorities:** goes for healers, spitters and climbers first, side-aims at armour and manages the tank.

### New mechanics
- **New bugs:**

  | Bug | Behaviour | First level |
  |---|---|---|
  | Gnat swarm | Tiny and fast | L2 |
  | Blob maggot | Splits into 3 fast minis | L3 |
  | Dodgy roach | Dashes sideways when hit | L4 |
  | Rim runner | Sprinter | L5 |
  | Tin-cap beetle | Takes only 15% damage from the front; hit the sides, or flush the cap off | L7 |
  | Gob fly | Winds up, then spits gunk that blocks your view | L8 |
  | Nurse snail | Heals nearby bugs | L10 (card shows at L15) |

- **Wave twists**, each with a "LEVEL TWIST" card:

  | Twist | Effect | Levels |
  |---|---|---|
  | Lights Out | Flickering darkness; only the bugs' eyes glow | L9, L15 |
  | Soap Spill | Bugs slide around | L11, L17 |
  | Butt Bunkers | Cigarette butts shield bugs until they're soaked or flushed away | L13, L16 |
  | Fast Forward | ×1.3 speed and shorter gaps | L14, L17 |

- **Combo streak:** the coin multiplier rises up to ×4/×5/×6. Missing for more than 0.9 s or letting a bug escape resets it. The win screen shows your best streak.
- **Pickups:** a 6.5% drop chance. Drink can = more pressure; beer = wider stream for a short while.
- **Bosses:** lunge, spit and heal attacks, plus phase changes at 60% and 30% HP with a banner.
- **Fail pressure:**
  - Hearts: 4 / 4 / 3 (easy / normal / hard).
  - Tank drain: ×1 / ×1.15 / ×1.3.
  - Bug speed and attack rate go up with tier.
  - Stars: 3 for no losses, 2 for ≤1, 1 otherwise.
- **Intro cards:** one card the first time each bug or twist appears, stored in `S.seen`. Add `?cards` to force them again.

### Tier knobs (final)
```
easy  : hpa .5  hpb .65 dmg .8  lives 4 drain 1    sp 1    atk .8
normal: hpa .5  hpb .7  dmg .77 lives 4 drain 1.15 sp 1.08 atk 1
hard  : hpa .4  hpb .75 dmg .82 lives 3 drain 1.3  sp 1.16 atk 1.3 fin .72
```
In this list, dmg = the player's damage multiplier. The per-level HP shape is `DMT` in game.js.

### Sims (2D model, 28 seeds, greedy upgrade path, retry-until-win coins). Win % averaged over L1–L18

| tier | casual .35 | average .6 | skilled .85 | target |
|---|---|---|---|---|
| v6.2 Normal (human bot) | 44.9 | 78.2 | 95.3 | — |
| v6.2 Iron (human bot) | 21.7 | 31.5 | 72.3 | ≈ new Regular |
| **v7 Pee-Wee** | 46.7 | 77.6 | 97.9 | casual ~35 |
| **v7 Regular** | 16.8 | 44.4 | 81.1 | 10 / 45 / 75 |
| **v7 Iron** | 2.8 | 19.7 | 47.2 | – / 10 / 35 |
| v7 Iron final boss (L18), skilled | | | 18 | ~15 |

Notes:
- **Results jump between runs.** Results depend on the upgrade path. Whether a skilled player clears L8 early decides the rest, so Iron skilled swung between 25 and 57 across runs with nearly the same knobs.
- **Possible slack.** Pee-Wee casual and Iron skilled are above target, but the bot still beats real phone players in quick decisions. If Iron feels too brutal on phones, raise hard `dmg` to .9.
- **Next levers if it's still too easy:** Regular `hpa` and `lives`.

## v7.1 — run-based coins & upgrades

Tilo (phone) hit L18-ish with 3 streams, restarted, and still had 3 streams at L1 because coins/upgrades were global and permanent.

### Fix
- A **run** = one playthrough from L1 on a given tier.
- Coins and upgrades live in `S.rd[tier]` and reset on **NEW RUN**.
- Stars / best unlock (`S.sd`, `S.ud`) stay permanent per tier.
- Mid-run you can only play the current level (`S.prog`). Replaying earlier levels is disallowed (start a NEW RUN instead).
- Entering a level snapshots coins+upgrades; **Try again** / pause Restart restores that snapshot (no farming).
- Shop header: **Upgrades · This run**.
- Migration (`S.runV=71`): wipe coins/upgrades to zero for all tiers. Stars kept. Avoids carrying a maxed stream into a fresh start.

### Sim
The v7 sim already assumed a greedy per-run upgrade path from zero. Re-ran 28 seeds; numbers identical to v7 FINAL (Pee-Wee 46.7/77.6/97.9, Regular 16.8/44.4/81.1, Iron 2.8/19.7/47.2).
