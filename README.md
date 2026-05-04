# 2G Frequency Planner

A single-file browser-based tool for planning GSM (2G) radio frequencies, BSIC, and neighbour lists for new sites — built on top of an existing network's GIS and parameter exports.

**Author:** Ankit Jain  
**Live tool:** https://ankitnitk.github.io/2g-freq-planner/

---

## How to Use

1. Open the tool in any modern browser (internet required on first load for CDN libraries).
2. **Step 1 — Load data:** upload three files:
   - **GIS database** — one row per existing cell/sector; must contain site name, cell name, latitude, longitude, azimuth.
   - **CM Export / Summary sheet** — one row per cell; must contain cell name, BCCH, TCH/MA list, NCC, BCC (or BSIC). Optionally LAC, RAC, BSC.
   - **New sites CSV** — one row per sector to plan; must contain site name, latitude, longitude, azimuth, TRX count for 900 and 1800.
3. **Step 2 — Configure** algorithm parameters and ARFCN pools.
4. **Step 3 — Plan** and review results per site/sector. Export to Excel.

> **Offline use:** if CDN scripts fail to load, download the four JS libraries listed in the HTML `<head>` comment and reference them locally.

---

## Algorithm Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| Search radius (km) | 10 | Maximum distance to consider any cell as a candidate neighbour or frequency conflict |
| 1st tier radius (km) | 5 | Distance cap for T1 neighbour classification and strict BCCH avoidance |
| BSIC uniqueness radius (km) | 50 | BCCH+BSIC combination must be unique within this distance; retries at 80% steps |
| Beam width (°) | 65 | Half-power beam width used for overlap scoring |
| NCC pool | 0-7 | Allowed NCC values (accepts ranges and lists, e.g. `2,4,6` or `0-7`) |
| Max external neighbours | 10 | Maximum neighbours per sector in the export (intra-site always included) |
| Planning passes | 3 | Number of multi-pass Jacobi iterations across all sites (see Technical Notes) |
| Band 1 (GSM-900) BCCH pool | 76-87 | ARFCN pool for BCCH selection — comma/range format, e.g. `76-87` or `78,80,86` |
| Band 1 (GSM-900) TCH pool | 88-101, 123, 124 | ARFCN pool for TCH selection (same format) |
| Band 2 (GSM-1800) BCCH pool | 562,563,610 | Used as BCCH source for 1800-only sectors (0 TRX on 900) |
| Band 2 (GSM-1800) TCH pool | 564-571,601-610 | 1800-band TCH pool; also used for dual-band (900+1800) cells |

---

## Neighbour Tier System

Neighbours are classified by hop-count on the beam-overlap graph. All classification is **directional** (based on azimuth and beam width), not just distance.

### Tier definitions

| Tier | Condition |
|------|-----------|
| **Intra-site** | Other sectors of the same planned site (rank 0 in export) |
| **T1** | Within `1st tier radius` AND has direct beam overlap with the source sector (after fine-tuning) |
| **T2** | Beyond `1st tier radius` but still has direct beam overlap, OR co-site with a T1 cell |
| **T3** | BFS one hop further — overlaps any T1/T2 cell, or is co-site with a T1/T2 cell |

### Direct beam overlap definition

A candidate cell qualifies as having direct beam overlap if **both**:
- **fwdS > 5%** — source sector's beam points toward the candidate  
  `fwdS = max(0, 1 − angleDiff(bearing, sourceAzimuth) / beamWidth)`
- **revS > 5%** — candidate's beam points back toward the source  
  `revS = max(0, 1 − angleDiff(reverseBearing, candidateAzimuth) / beamWidth)`

**Intra-site bridge exception:** a candidate with strong revS (≥ 40%) toward the planned site can also qualify as T1/T2 if a *sibling sector* of the planned site has fwdS > 5% toward it — modelling the free intra-site handover hop.

### Tier fine-tuning (applied after initial classification)

Three post-processing stages refine the raw T1/T2 assignment:

| Stage | Rule | Badge |
|-------|------|-------|
| **Demote** | Raw T1 with one side ≤ 5% AND stronger side < 45% → T2 | `T2↓` |
| **Upgrade** | Raw T2 with both fwdS > 60% AND revS > 60% → T1 | `T1↑` |
| **Shadow check** | Raw T1 candidate C is demoted if a closer confirmed-T1 cell B already covers C's direction, meaning C is not in the true first reachable ring. Three shadow cases: (1) B's beam points toward C (`fwdS(B→C) > 40%`); (2) both are back-beam cells (fwdS ≈ 0) within `beamWidth/3` bearing; (3) both are front-facing within `beamWidth/3` bearing — closer one wins | `T2~` |

Co-site cells of the same neighbour site are never shadowed against each other.

### Neighbour ranking (within each tier)

```
nbRelevance = distance / (1 + (fwdS + revS) × 3)
```

Lower score = higher priority. Cells with **both** fwdS ≤ 5% and revS ≤ 5% are always ranked after cells with any meaningful overlap on at least one side. Within each overlap bucket, the relevance formula applies.

---

## BCCH Planning

BCCH selection uses a **four-pass cascade** with progressively relaxed constraints. Within each pass, candidates are ordered by maximum frequency separation from all neighbours in the search radius; ties are broken randomly to spread load.

| Pass | Mode label | Blocked BCCHs |
|------|-----------|---------------|
| 1 | `clean` | Intra-site ±1, all T1 BCCHs, all T2 BCCHs |
| 2 | `t2_reuse` | Intra-site ±1, all T1 BCCHs (T2 reuse allowed) |
| 3 | `t1_reuse` | Intra-site ±1 only (T1+T2 reuse allowed; BSIC guard applies) |
| 4 | `forced` | Nothing blocked (pool exhausted) |
| — | `impossible` | Every BCCH in the configured pool is already used by another planned sector |

**Global BCCH uniqueness:** no two planned sectors may ever share the same BCCH. This is enforced globally across all sites in all planning passes — even `forced` mode never assigns a BCCH already allocated to another sector. If the pool is exhausted, `bcchMode = impossible` is reported rather than silently duplicating.

**BSIC+BCCH uniqueness** is enforced jointly — BCCH and NCC/BCC are selected together so that no cell within `bsicRadius` shares the same (BCCH, NCC, BCC) triplet. If no valid triplet exists at the full radius, the radius is reduced by **80%** and all passes are retried (`50 km → 40 km → 32 km → ...`). This continues until the radius drops below 1 km, after which the least-conflicting combination is used as absolute last resort.

**Intra-site adjacency:** the intra-site blocked set includes not just exact BCCH values of other sectors but also their ±1 adjacent ARFCNs, to prevent BCCH–TCH adjacent channel interference within the same site.

---

## BSIC Planning (NCC + BCC)

BSIC = NCC × 8 + BCC (6-bit value, range 0–63).

- NCC is selected from the configured **NCC pool** (default 0–7).
- BCC is selected from 0–7.
- Both are chosen **jointly with BCCH** (see above) to guarantee the (BCCH, NCC, BCC) triplet is unique within `bsicRadius`.
- Selection order within NCC pool and BCC range is **randomised per sector** to avoid systematic low-value bias.
- After selection, the **actual minimum repeat distance** is computed — the nearest existing or previously-planned cell that shares the same `(BCCH, NCC, BCC)` triplet. This is displayed in the results table ("BSIC sep" column), in the BSIC detail card ("Min BSIC+BCCH repeat dist"), and exported as `BSIC_Repeat_km`. A blank / ∞ means the triplet is fully unique across the entire working network. Values below 10 km are highlighted in amber as a quality flag.

---

## TCH Planning

TCH selection uses a **five-pass cascade** per sector. Each pass tries a progressively relaxed set of constraints:

| Pass | Mode label | NB conflict | Intra-site BCCH adj | Intra-site TCH exact reuse | Intra-site TCH adj |
|------|-----------|-------------|--------------------|--------------------------|--------------------|
| 1 | `clean` | ✗ avoided | ✗ avoided | ✗ avoided | ✗ avoided |
| 2 | `site_adj` | ✗ avoided | ✗ avoided | ✗ avoided | ✓ allowed |
| 3 | `nb_reuse` | ✓ allowed | ✗ avoided | ✗ avoided | ✗ avoided |
| 4 | `nb_reuse_adj` | ✓ allowed | ✗ avoided | ✗ avoided | ✓ allowed |
| 5 | `reuse` | ✓ allowed | ✗ avoided | ✓ allowed | ✓ allowed |
| — | `impossible` | Every ARFCN in the configured pool for this band is already used by another planned sector |

**Global TCH uniqueness:** no two planned sectors may ever share the same TCH frequency. This constraint is enforced before any pool filtering — globally used ARFCNs are stripped from the pool at the start of each `planTCH` call, regardless of which pass is active. Adjacent ARFCNs (±1) to other sectors' TCHs are still allowed. If the band pool is fully exhausted by other sectors, `tch900Mode` / `tch1800Mode` = `impossible` is reported.

**Intra-sector adjacency (minSep = 2) is never relaxed** — two ARFCNs within the same cell must always differ by at least 2 to avoid adjacent channel interference (ACI) within the TRX chain.

**BCCH–TCH adjacency within a site:** the intra-site BCCH set used to filter TCH candidates is expanded to ±1, so no TCH of any sector at the same site can be adjacent to any BCCH of any other sector at that site.

**Round-robin assignment across sectors:** instead of assigning all TCHs to S1 then all to S2 then S3, the planner assigns one TCH per sector per band in rotation (S1 → S2 → S3 → S1 → S2 → S3 …). Each pick is made with full awareness of all other sectors' already-committed TCHs, preventing the first sector from occupying both ends of the pool and forcing later sectors into adjacent slots.

**Optimal sibling-aware selection:** within each pass, the planner tries all valid combinations (up to a combinatorial limit) and picks the one that **minimises the minimum distance to any sibling sector's already-committed TCHs** — i.e. clusters this sector's TCHs *as close as possible* to its siblings (still respecting the pass constraints). This keeps all of one site's TCHs in a tight contiguous block and leaves the far end of the pool free for other sites, maximising contiguous free space globally. Tie-break: minimise internal spread. When no siblings have been committed yet, the first sector picks a tight cluster at the low end of the pool.

**Co-site existing sector awareness:** when planning a new sector on an already-existing site (detected by co-location within 0.05 km), the existing sectors' BCCHs and TCHs are pre-loaded into the intra-site register. The new sector therefore avoids conflicts and adjacency with them exactly as it would with other newly planned sectors of the same site.

---

## LAC / RAC / BSC Planning

All sectors of the same planned site receive **identical** LAC, RAC, and BSC values.

### Rule priority

1. **Existing site** (any GIS cell within 0.05 km of the planned location has LAC/RAC/BSC data) → inherit directly from those co-located cells (majority vote if multiple values present). Tier-1 neighbours are ignored.

2. **New site** → pool the T1 neighbours of **all planned sectors combined**, then:
   - Find the most frequent (LAC, RAC, BSC) combination.
   - Tie-break: the combination whose nearest representative cell is closest to the planned site wins.

LAC/RAC/BSC values are sourced from the CM Export / Summary sheet via the column mapping (auto-detected or manually selected).

---

## Export Format

The exported `freq_plan.xlsx` contains two sheets:

### Sheet 1 — Freq Plan

One row per planned sector.

| Column | Description |
|--------|-------------|
| Site, SiteID, Cell, Sector, Azimuth | Site/sector identity |
| TRX_900, TRX_1800 | TRX counts |
| BCCH_Band | Band carrying the BCCH |
| BCCH | Planned BCCH ARFCN |
| BCCH_Mode | Planning quality (`clean`, `t2_reuse`, `t1_reuse`, `forced`) |
| TCH_900_Count, TCH_900, TCH_900_Mode | 900-band TCH list and quality |
| TCH_1800_Count, TCH_1800, TCH_1800_Mode | 1800-band TCH list and quality |
| NCC, BCC, BSIC | Planned BSIC (BSIC decimal = NCC×8 + BCC) |
| BSIC_Repeat_km | Minimum distance (km) to the nearest existing or previously-planned cell sharing the exact same (BCCH, NCC, BCC) triplet; blank = fully unique in the working network |
| LAC, RAC, BSC | Planned location/routing area and BSC |

### Sheet 2 — Neighbour Plan

One row per neighbour pair (intra-site rank 0, external rank 1, 2, 3 …).

| Column | Description |
|--------|-------------|
| Source_Cell, Target_Cell | Neighbour pair |
| Rank | 0 = intra-site; 1+ = external, ordered by relevance score |
| Distance_km | Distance between sites |
| Tier | `Intra-site`, `1st`, `1st(upgraded)`, `2nd`, `2nd(downgraded)`, `2nd(shadowed)`, or `3rd` |
| Fwd_Overlap_pct | Source beam overlap toward target (%) |
| Rev_Overlap_pct | Target beam overlap back toward source (%) |
| Source_BCCH, Neighbour_BCCH | BCCHs for conflict checking |
| Source_TCH, Neighbour_TCH | TCH lists |

Both sheets have **blue headers** (frozen below row 1) and **freeze panes** after the primary key column.

---

## Technical Notes

- **No server, no install** — pure client-side HTML/JS. Double-click to open in any browser.
- **Dependencies loaded from CDN** (internet required on first load): React 18, Babel standalone, xlsx-js-style.
- **Offline fallback:** download the four JS files and reference them locally — see the comment block in `<head>`.
- **Randomisation:** NCC, BCC, and BCCH tie-breaking are randomised per sector to avoid systematic low-value bias.
- **Multi-pass Jacobi iteration:** sites are first planned sequentially (pass 1). In passes 2+, each site is re-planned using all *other* sites' frequencies from the previous pass as constraints — so no site is permanently disadvantaged by planning order. The best-scoring pass (fewest degraded BCCH sectors, then fewest T1 BCCH conflicts) is returned. Configurable via the `Planning passes` parameter (default 3).
- **Badge accuracy:** after all sectors of a site are planned, a post-processing step upgrades any sector's TCH mode badge to `~ x-sector adj` if a sibling sector's TCH is adjacent (±1), regardless of which sector was planned first.

---

## Changelog

### 2026-05-04

#### Intra-site frequency uniqueness (BCCH + TCH)
No two sectors of the same site may ever be allocated the same BCCH or the same TCH frequency. Adjacent (±1) is still allowed.

- **BCCH:** introduced `inSiteExact` — a set of exact BCCHs already assigned to sibling sectors within the same `planOneSite` call. All four BCCH cascade passes (including `forced`) now filter against `inSiteExact`, so a sibling's BCCH can never be reused even if the BSIC differs (NCC/BCC uniqueness alone is insufficient — the raw BCCH must also be unique within the site). The absolute last-resort fallback similarly filters against `inSiteExact` and reports `bcchMode = impossible` only if the pool is truly exhausted.
- **TCH:** `poolE` (last-resort TCH pool, previously only guarded by intra-site BCCH adjacency) now also excludes `otherSectorTCH`, preventing exact intra-site TCH reuse even when all softer constraints are relaxed.

#### TCH cluster-close sibling selection
`optimalTCHSelect()` now **minimises** the gap to sibling sectors' already-committed TCHs (previously it maximised). This clusters all sectors of a site into a tight contiguous block of ARFCNs, leaving the far end of the pool free for other allocations and maximising globally available contiguous space. Tiebreak: minimise internal spread. When no siblings have been committed yet, minimise spread so the first sector takes a compact block.

#### BSIC+BCCH minimum repeat distance
After the `(BCCH, NCC, BCC)` triplet is selected for each sector, the planner computes the **actual nearest repeat distance** — the haversine distance to the closest cell in the working network that carries the identical triplet. Reported in three places:
- **Results table:** "BSIC sep" column — shows distance in km or ∞ if fully unique; values < 10 km shown in amber.
- **BSIC detail card:** "Min BSIC+BCCH repeat dist" tile below NCC/BCC.
- **Excel export:** `BSIC_Repeat_km` column in Sheet 1 (blank = fully unique).

#### Tier fine-tuning shadow check — beamWidth/3 bearing bucket
The angular window used to determine whether two cells are "in the same direction" from the planned site was widened from `beamWidth/4` to `beamWidth/3`. This reduces false shadow demotion of cells that are meaningfully separated in bearing while still suppressing back-ring candidates that are truly co-directional.

#### Neighbour ranking — zero-overlap cells ranked last
Cells with **both** `fwdS ≤ 5%` and `revS ≤ 5%` (no meaningful beam overlap in either direction) are always ranked after any cell that has overlap on at least one side, regardless of distance. This two-bucket sort ensures pure proximity doesn't promote radio-dark cells above partially-overlapping ones.
