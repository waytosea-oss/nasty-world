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
