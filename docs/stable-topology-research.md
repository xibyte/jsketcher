# Stable topology IDs research

This research branch adapts upstream primitive, mirror and pattern ID changes for the embedded desktop fork. Upstream authors are retained in the individual commits. A project counter supplies new feature IDs, persisted with snapshots; patterns include their instance number in copied face and edge IDs. Copy analysis reads the source shell's registered model IDs, including edges that lack a BREP data ID.

Histories that predate feature IDs are marked with the reserved internal value `-1` on load and replay the original primitive and copy ID conventions. This avoids renaming old face/edge/sketch references. New operations receive positive IDs. The marker persists when the project is saved again. Legacy replay preserves any ambiguity already present in the old ID scheme.

Chromium source/build tests: `test/webos/stable-topology.test.cjs` requires this branch built and served at `JSKETCHER_TEST_URL`, a helper `static/webosTest.bundle.js`, Puppeteer Core, and a Chromium debugging endpoint at `CODI_TEST_CDP`. It exercises a box, linear and radial patterns, and a mirror of a patterned face; checks unique face/edge IDs, undo/redo, snapshot restore and next counter. `test/webos/stable-topology-legacy.test.cjs` additionally requires a pre-feature-ID build at `JSKETCHER_LEGACY_URL`: it creates an old box and pattern referencing an old face, restores the snapshot into this build, compares IDs, saves/restores a second time, and adds a new sphere.

Example:
```
NODE_PATH=/path/to/node_modules JSKETCHER_TEST_URL=http://127.0.0.1:19728/ CODI_TEST_CDP=http://127.0.0.1:19255 node test/webos/stable-topology.test.cjs
NODE_PATH=/path/to/node_modules JSKETCHER_LEGACY_URL=http://127.0.0.1:19710/ JSKETCHER_TEST_URL=http://127.0.0.1:19728/ CODI_TEST_CDP=http://127.0.0.1:19255 node test/webos/stable-topology-legacy.test.cjs
```

Scope and caveats: default primitive snapshot round trips were exercised separately for box, cylinder, cone, sphere and torus; corner cases and nondefault parameters were not exhausted. Copy matching currently relies on OCCT returning faces/edges in corresponding list order. Reproducible IDs do not prove correspondence to the same geometric face after transformations or engine-version changes; geometric matching and topology-changing regression cases remain needed. Only a box/linear-pattern legacy fixture was round-tripped; old projects with sketches, other primitives, mirror/radial operations, boolean edits, and mixed old/new features need coverage. Multiple old primitive faces may already share ambiguous IDs, which this compatibility mode intentionally does not rewrite. The branch is research, not a release or security approval.
