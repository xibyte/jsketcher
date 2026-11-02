# DXF import research (not ready to expose)

This branch brings over the upstream DXF parser and relevant elliptical sketch
geometry commits, plus a local-only in-place import prototype. Importing is not
yet a complete file workflow and this branch is not a release candidate.

The upstream parser represents a selected subset of 2D DXF entities. Tests
cover real parsing of lines, circles, points, closed lightweight polylines and
leading comments. They also exercise block transforms and selected rejection
cases directly. The parser and writer are pinned in the lockfile. Test with
`node test/coreTests/run-dxf-import.cjs` after installing the repository's
locked dependencies. Set `DXF_TEST_DEPENDENCIES` to an alternate node_modules
directory to test against isolated parser and writer installs.

Research fixes reject splines, partial ellipses, scaled and array inserts,
missing blocks, and recursive or excessively nested blocks instead of
silently changing their geometry. Block transforms now account for base points
and compose through nested inserts. Ellipse major radii use vector magnitude.
The importer has not been qualified for arbitrary external files. A pre-scan
rejects unknown entity records in ENTITIES and BLOCKS instead of letting the
parser silently discard them. Explicit nonzero Z coordinates,
elevation, thickness and 3D-polyline flags on supported parsed entities are
rejected instead of silently flattened; rejected imports retain the original
sketch. The adapter also scans extrusion-direction group codes on supported
entity records before parsing, because the parser discards those fields.
This is not a complete format or 3D detector: the parser can discard fields
within recognized entities before the adapter sees them. In particular, 3D orientation,
extrusion, bulge arcs, malformed and very large inputs, units, layers, writer
round-trips and parsed nested blocks require further tests and explicit safe
handling; the direct nested-block tests are not parser end-to-end tests.

Before offering import in the desktop, route selection and reading through the
existing host-owned My files service using a validated frame/source/origin
bridge. Treat import as a guarded, undoable project modification, warn before
replacement or append deliberately, and make errors visible. Browser-native
upload alone bypasses the desktop workflow. Test on phone and desktop, under
production CSP, with repeated imports, app closure, and concurrent windows.
Review licenses and corresponding source for dependencies, then build and test
against the exact lockfile before publishing. Integrate carefully with the
independently developed spline and strict-history changes.

## Local-only in-place import prototype

The sketch toolbar can request an import through the same-origin host bridge.
The research host chooses a DXF from My files, checks the owner, file version,
size and sketch state, then appends supported shapes with strict checked
reconstruction and an undo checkpoint. Failure attempts to restore the earlier
sketch; if rollback itself fails, history retains a recovery snapshot and the
user must not save the partial sketch. Cancel leaves the sketch untouched.
This is an experimental research integration and must not be deployed before
fixing the remaining DXF compatibility and unsupported-entity limitations
above and reconciling the branch with the final host and strict-history work.

`test/webos/dxf-import-browser.test.cjs` exercises actual in-place import,
undo/redo, strict reconstruction failure and serialized reopen in local
Chromium. See `test/webos/README-sketch-history.md` for the test-only build,
helper bundle and production-like CSP server requirements. It requires a
`puppeteer-core` install in the test environment. The companion host research
branch tests its file-picker bridge against an in-memory file service.
