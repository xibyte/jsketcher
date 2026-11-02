# Experimental dual-engine and surfacing research

This branch is a research merge, not a release candidate. It retains the
existing OpenCascade engine and established CAD operation implementations and
registers the new native geometry service and surfacing editor alongside them.
The native engine is not a drop-in replacement for OCC: many operations in
upstream's native branch are explicitly unimplemented, and the prototype has
not compared general topology, solids, booleans, curved surfaces or volumes.

`surfacing-engines-browser.test.cjs` compares an OCC box against a native
extrusion of the same rectangle using face/vertex counts, bounds and an independently calculated planar-shell volume. This calculation is limited to the tested box and is not an engine volume API. It
also verifies a surfacing scene round-trip, rejects a stale serialized ID
counter, adds a surface after restore and checks distinct IDs and references.
The test serves the app beneath a nested prefix with a CSP allowing self-hosted
WebAssembly; it expects test-only `static/surfacingTest.bundle.js` compiled
from `surfacing-compare-entry.js`. See `README-sketch-history.md` for browser,
CSP and build prerequisites. The helper is never a production asset.

The host-owned project snapshot prototype includes a surfacing scene in an
optional `surfacing` field and verifies its reconstruction. The companion
host research branch includes a local in-memory My files test; the standalone
Chromium tests do not prove real server sync, crash recovery, concurrency,
phone use, complex constraints, all ID prefixes or adversarial files. Source
and notices for both WASM engines and their transitive dependencies must be
reviewed before any distribution. Imported legacy files and cross-engine
compatibility need separate qualification before this branch can be published.

The research branch preserves OCCClassifier for the existing OCC operation
history and keeps NativeClassifier separately available. Run
`node test/coreTests/run-classifier-engines.cjs` to check that the native
classifier accepts native objects and the OCC classifier routes its BREP pointer
arguments to OCC rather than silently using native classification. Real
geometric classification across curved, overlapping and historical models is
not fully qualified by this unit test.
