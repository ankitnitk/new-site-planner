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
| Band 1 (GSM-900) BCCH pool | 562,563,610 | ARFCN pool for BCCH selection (comma/range format) |
| Band 1 (GSM-900) TCH pool | 564-571,601-610 | ARFCN pool for TCH selection |
| Band 2 (GSM-1800) TCH pool | — | 1800 band TCH pool (optional; used for dual-band cells) |

---

## Neighbour Tier System

Neighbours are classified by hop-count on the beam-overlap graph. All classification is **directional** (based on azimuth and beam width), not just distance.

### Tier definitions

| Tier | Condition |
|------|-----------|
| **Intra-site** | Other sectors of the same planned site (rank 0 in export) |
| **T1** | Within `1st tier radius` AND has direct beam overlap with the source sector |
| **T2** | Beyond `1st tier radius` but still has direct beam overlap with source sector, OR is a co-site sector of a T1 cell |
| **T3** | BFS one hop further — overlaps any T1/T2 cell, or is co-site with a T1/T2 cell |

### Direct beam overlap definition

A candidate cell qualifies as having direct beam overlap if **both**:
- **fwdS > 5%** — source sector's beam points toward the candidate  
  `fwdS = max(0, 1 − angleDiff(bearing, sourceAzimuth) / beamWidth)`
- **revS > 5%** — candidate's beam points back toward the source  
  `revS = max(0, 1 − angleDiff(reverseBearing, candidateAzimuth) / beamWidth)`

**Intra-site bridge exception:** a candidate with strong revS (≥ 40%) toward the planned site can also qualify as T1/T2 if a *sibling sector* of the planned site has fwdS > 5% toward it — modelling the free intra-site handover hop.

### Neighbour ranking (within each tier)

```
nbRelevance = distance / (1 + (fwdS + revS) × 3)
```

Lower score = higher priority. Cells with zero overlap are never ranked above overlapping cells.

---

## BCCH Planning

BCCH selection uses a **four-pass cascade** with progressively relaxed constraints. Within each pass, candidates are ordered by maximum frequency separation from all neighbours in the search radius; ties are broken randomly to spread load.

| Pass | Mode label | Blocked BCCHs |
|------|-----------|---------------|
| 1 | `clean` | Intra-site ±1, all T1 BCCHs, all T2 BCCHs |
| 2 | `t2_reuse` | Intra-site ±1, all T1 BCCHs (T2 reuse allowed) |
| 3 | `t1_reuse` | Intra-site ±1 only (T1+T2 reuse allowed; BSIC guard applies) |
| 4 | `forced` | Nothing blocked (pool exhausted) |

**BSIC+BCCH uniqueness** is enforced jointly — BCCH and NCC/BCC are selected together so that no cell within `bsicRadius` shares the same (BCCH, NCC, BCC) triplet. If no valid triplet exists at the full radius, the radius is reduced by **80%** and all passes are retried (`50 km → 40 km → 32 km → ...`). This continues until the radius drops below 1 km, after which the least-conflicting combination is used as absolute last resort.

**Intra-site adjacency:** the intra-site blocked set includes not just exact BCCH values of other sectors but also their ±1 adjacent ARFCNs, to prevent BCCH–TCH adjacent channel interference within the same site.

---

## BSIC Planning (NCC + BCC)

BSIC = NCC × 8 + BCC (6-bit value, range 0–63).

- NCC is selected from the configured **NCC pool** (default 0–7).
- BCC is selected from 0–7.
- Both are chosen **jointly with BCCH** (see above) to guarantee the (BCCH, NCC, BCC) triplet is unique within `bsicRadius`.
- Selection order within NCC pool and BCC range is **randomised per sector** to avoid systematic low-value bias.

---

## TCH Planning

TCH selection uses a **five-pass cascade**, also with randomised pool order per sector.

| Pass | Mode label | NB conflict | Intra-site BCCH adj | Intra-site TCH exact reuse | Intra-site TCH adj |
|------|-----------|-------------|--------------------|--------------------------|--------------------|
| 1 | `clean` | ✗ avoided | ✗ avoided | ✗ avoided | ✗ avoided |
| 2 | `site_adj` | ✗ avoided | ✗ avoided | ✗ avoided | ✓ allowed |
| 3 | `nb_reuse` | ✓ allowed | ✗ avoided | ✗ avoided | ✗ avoided |
| 4 | `nb_reuse_adj` | ✓ allowed | ✗ avoided | ✗ avoided | ✓ allowed |
| 5 | `reuse` | ✓ allowed | ✗ avoided | ✓ allowed | ✓ allowed |

**Intra-sector adjacency (minSep = 2) is never relaxed** — two ARFCNs within the same cell must always differ by at least 2 to avoid adjacent channel interference (ACI) within the TRX chain.

**BCCH–TCH adjacency within a site:** the intra-site BCCH set used to filter TCH candidates is expanded to ±1, so no TCH of any sector at the same site can be adjacent to any BCCH of any other sector at that site.

**Intra-site TCH spread:** the `spreadSelect` algorithm maximises the minimum frequency separation among selected TCHs, ensuring the widest possible spread within the available pool.

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
| LAC, RAC, BSC | Planned location/routing area and BSC |

### Sheet 2 — Neighbour Plan

One row per neighbour pair (intra-site rank 0, external rank 1, 2, 3 …).

| Column | Description |
|--------|-------------|
| Source_Cell, Target_Cell | Neighbour pair |
| Rank | 0 = intra-site; 1+ = external, ordered by relevance score |
| Distance_km | Distance between sites |
| Tier | `Intra-site`, `1st`, `2nd`, or `3rd` |
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
- **Randomisation:** NCC, BCC, BCCH tie-breaking, and TCH pool starting point are all randomised per sector to avoid systematic low-value bias across the plan.
- **Sequential planning:** sites are planned in the order they appear in the new-sites file. Each planned site's frequencies are locked and treated as existing network before the next site is planned.
