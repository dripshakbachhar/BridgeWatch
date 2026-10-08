# BridgeWatch — Structural Health Monitoring Simulator

BridgeWatch is a software prototype for experimenting with structural-health-monitoring concepts using synthetic multi-sensor data.

## Current research/engineering question

Can a lightweight statistical monitoring pipeline detect deviations from a simulated structural baseline and help prioritize components for further inspection?

## v0.1 scope

- 7 structural components
- 8 virtual sensors
- 5 sensor types
- 6 simulation scenarios
- Baseline statistics
- Z-score anomaly classification
- Component-level prioritization
- Unit tests for the engineering core

## Important limitation

The sensor data and decision model are synthetic and simplified. This project is an educational/software engineering prototype and is **not** a structural safety, certification, or real-world inspection system.

## Run locally

Use Node.js 22.12+ for the current Vite/Vitest toolchain.

```bash
npm install
npm run test
npm run dev
```

Then open the local URL printed by Vite.

## Architecture

```text
Scenario
   ↓
Sensor generator
   ↓
Measurements
   ↓
Baseline statistics
   ↓
Z-score analysis
   ↓
Sensor severity
   ↓
Component assessment
   ↓
Inspection priority
```

## Next milestones

1. Add time-series charts.
2. Add a dedicated sensor laboratory view.
3. Compare multiple anomaly-detection strategies.
4. Add reproducible experiments and results.
5. Add end-to-end browser tests.
6. Document model limitations and assumptions.
