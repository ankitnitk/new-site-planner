# Sample Data

Generic sample input files for demonstrating the planning tools.
All site names, coordinates and parameters are fictional — no real network data.

## 2G Frequency Planner

| File | Tool input | Description |
|------|-----------|-------------|
| `2g_gis_sample.csv` | GIS database | 8 fictional sites × 3 sectors each (24 cells) |
| `2g_cm_export_sample.csv` | Nokia CMExport parameters | BCCH, TCH, NCC, BCC, LAC, RAC, BSC per cell |
| `2g_new_sites_sample.csv` | New sites to plan | 3 new sites × 3 sectors each (INDIA, JULIET, KILO) |

## 4G PCI / RSI / TAC Planner

| File | Tool input | Description |
|------|-----------|-------------|
| `4g_gis_sample.csv` | Current network GIS | 8 fictional sites × 3 sectors each (24 cells) |
| `4g_summary_sample.csv` | 4G Summary (LNCEL Details) | PCI, RSI, TAC per cell |
| `4g_new_sites_sample.csv` | New sites to plan | 3 new sites × 3 sectors each (INDIA, JULIET, KILO) |

## How to use

1. Open the tool in a browser
2. Upload the three matching files above
3. Column mapping is auto-detected — verify and adjust if needed
4. Proceed through the steps to see the planned output
