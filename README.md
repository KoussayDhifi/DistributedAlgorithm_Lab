# Distributed Algorithms Simulator (TP)

This project is an interactive pedagogic simulator for distributed algorithms (mutual exclusion and election). Frontend is built with React + TypeScript, Mantine UI, and D3 for visuals.

Features implemented:
- Visualizer for processes
- Event log
- Modules for Ricart–Agrawala, Token Ring, Bully, Ring Election

Run locally:

1. Install dependencies:

```bash
npm install
```

2. Start dev server:

```bash
npm run dev
```

Notes:
- This scaffold implements the UI, simulation core, and algorithm modules. It is designed for further extension: add handlers to connect modules to the simulator, implement failure injection, metrics comparisons, and rich message tracing for TP reports.
