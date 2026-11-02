# DXF import research (not ready to expose)

This branch brings over the upstream DXF parser and relevant elliptical sketch
geometry commits. It does not add an import control to the desktop. Importing
is not yet a complete file workflow and this branch is not a release candidate.

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
The importer still ignores some unsupported DXF entities and has not been
qualified for arbitrary external files. In particular, 3D orientation,
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
