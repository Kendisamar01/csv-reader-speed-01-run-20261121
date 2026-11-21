# csv-reader-speed-01-run-20261121

![csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)
![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/Kendisamar01/csv-reader-speed-01-run-20261121/rank.svg)
![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/Kendisamar01/csv-reader-speed-01-run-20261121/reward.svg)

A faster exact drop-in for csv-reader 1.0.0: same answers, less CPU. `solve.js` reads each
input once, left to right, with slice-based field extraction and a fast path that avoids the
reference reader's per-character string concatenation, while preserving every error, line
number and broken-row detail. `main.ts` is the harness driver.

Bounty: https://make.fun/bounty/csv-reader-speed-01-run-20261121
