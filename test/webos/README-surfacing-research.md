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
from `surfacing-compare-entry.js` using the test-only `surfacing-webpack.config.cjs`. See `README-sketch-history.md` for browser,
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

## Experimental CSP-compatible Manifold build

The npm `manifold-3d` 3.4.1 glue uses dynamic JavaScript generation and cannot
initialize under the current `script-src 'self' 'wasm-unsafe-eval'` policy. Do
not relax that policy to use it. A source-built candidate uses the upstream
Emscripten options `-sDYNAMIC_EXECUTION=0 -sEMBIND_AOT=1`. Two clean local
builds on the same R730 toolchain produced identical hashes:

- Manifold v3.4.1 source commit `31afd71d17c7a94cfaeada83f657d7b42628ead6`;
  Apache-2.0. The published npm package reports gitHead
  `91a49ca2969990297d62639c8c6c8af20474f33e`; neither this relationship nor an
  npm version string proves the exact source of the published binaries.
- Clipper2 commit `46f639177fe418f9689e8ddb74f08a870c71f5b4`; include and
  review its source and license alongside Manifold's.
- Emscripten 5.0.2, releases build `0a320d2395858e63288b3632b81535444ca2c59d`.
- `manifold.js` SHA-256 `cd2031fd75cbbc812b550dd228f95b9fd666ae4da6557f840e3d3ed4cbed268b`;
  `manifold.wasm` SHA-256 `7bb5f8ee10fcafdab78799b1e5dd2cdc7c282ea0bf8e7939c43f3ad34b823e3d`.

With clean checkouts at those commits, Emscripten active, and an empty build
directory outside both source trees, run:

```sh
python3 build/build-manifold-csp.py --source /path/to/manifold \
  --clipper /path/to/clipper2 --build-dir /path/to/empty-build --jobs 4
CODI_EMBED_NUMERIC=1 CODI_EMBED_MANIFOLD=1 npm run build
```

The script requires at least 15 GiB free, monitors the build volume, limits
parallelism to four, forces disconnected dependency fetching, and writes only
to an ignored local cache. It records output hashes; paths, toolchain details
and build outputs still require independent verification. Browser smoke tests
covered cube, sphere, mesh output and simple overlap booleans, not every
binding, geometry operation, device or failure case. The normal npm build
without `CODI_EMBED_MANIFOLD=1` is not CSP-compatible. These notes and a
successful build do not constitute complete corresponding-source or license
clearance for distribution.

A separate `native-overlap-browser.test.cjs` constructs both overlap operands
independently with native extrusion and native mesh generation. Under the
official CSP-compatible build, the 5×20×30 intersection has bounds
`[5,10]×[0,20]×[0,30]` and mesh volume 3000. The OCC intersection of the
same boxes independently yields volume 3000. Passing OCC-origin shells into
the native boolean service currently fails explicitly because those shells
do not carry native mesh-origin data; cross-engine conversion is unfinished.

Known UI defects in the actual app (not only the test helper): some toolbar
and history icons pass semantic `small`/`medium` values to raw React SVG icon
components, producing invalid SVG size warnings. The restored OCC Sweep,
Mirror Body and Move Body operation icons refer to missing legacy 32px PNGs
(and Move Body has no matching 96px PNG); matching upstream SVGs exist but
have not been wired and tested in this research branch.
