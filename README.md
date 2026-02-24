# Phantom - Hide in Plain Sight

Privacy tool that degrades the quality of tracking data by injecting plausible noise
into your digital footprint. Instead of blocking trackers (which is detectable),
Phantom makes the collected data unreliable.

## Architecture

- **Daemon** (Python): Background service that generates noise via LLM, schedules
  phantom activity, and coordinates with the browser extension.
- **Extension** (Chrome/Firefox): Injects noise directly in the browser — search
  queries, page visits, fingerprint randomization, behavioral camouflage.

## Quick Start

```bash
# Daemon
cd daemon
pip install -e .
phantom-daemon --config config.yaml

# Extension
cd extension
# Load as unpacked extension in Chrome (chrome://extensions)
```

## Modules

| Module | Layer | Description |
|--------|-------|-------------|
| LLM Engine | Daemon | Generates personas, search queries, browsing plans |
| Scheduler | Daemon | Controls timing/frequency of phantom activity |
| Search Injector | Extension | Injects background search queries |
| Phantom Browser | Extension | Visits pages in background tabs |
| Fingerprint Randomizer | Extension | Rotates canvas, WebGL, fonts, etc. |
| Behavioral Camouflage | Extension | Jitters mouse, scroll, keystrokes |
| Traffic Generator | Daemon | DNS lookups, background HTTP noise |
| Divergence Tracker | Both | Measures profile pollution effectiveness |
