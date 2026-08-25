# public/journey

76 graded, web-ready images. 15 MB. These ship.

| | |
| --- | --- |
| instances | 25 of 26 |
| capital cities | 6 of 6 |
| zones and extras | 45 |

Every vanilla instance except Blackrock Spire. There is no `lower-blackrock-spire`
or `upper-blackrock-spire`; `blackrock-mountain.webp` is the hub outside, not the
instance. Shoot it when the art pipeline runs again (`docs/TARI.md` §6.2).

## These are derived files

The masters are 20–29 MB PNGs and they are not in this repo, or in any repo.
They sit on the machine that made them:

```
~/Documents/FLYFE/undiscovered/ReLit-WoW-Zone-images    1.9 GB   84 files
~/Documents/FLYFE/undiscovered/art-sources              1.1 GB   67 files
~/Documents/FLYFE/undiscovered/layered-cities           100 MB   28 files
~/Documents/FLYFE/undiscovered/relit-images              67 MB    3 files
```

A second copy of all four is in `~/Documents/FLYFE/Whelp plz FINAL BACKUP/`.
Neither set has ever been committed anywhere. Keep it that way — 3.2 GB in git
history is permanent.

The webp here run 52 KB to 528 KB, roughly a hundredth of their source. That
gap is why 15 MB is fine in git and 3.2 GB is not.

`rail/` is a second derived layer: the same 75 pictures at 500px, 0.7 MB in
total, drawn by the rail (`scripts/rail-thumbs.mjs`). Re-run that script after
any reshoot — nothing checks that the two folders agree.

`door.jpg` is the one file that is not webp. Nothing depends on that; convert
it if you touch it.
