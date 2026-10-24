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
