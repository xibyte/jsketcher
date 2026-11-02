# WebOS integration baseline

This is the independently maintained CodiServer fork. Its Git remote is the LAN box-git repository; changes suitable for the original project can be proposed separately. The browser desktop integration is not yet complete or deployed.

## Initial browser checks

On the original fork baseline `c1905c4f9df9711206866c8b39e982f52d598d88`, a local production-style build was served to Chromium. The application loaded its own `jsketcher-occ-engine` WebAssembly asset. Using the project's existing modeling test helpers, a plane was created, a rectangle drawn as a constrained sketch, and an extrusion generated a solid. Project JSON stored the plane and extrusion history; sketch JSON stored the four segments and their coincident constraints. A reload restored the history and sketch and regenerated the solid. Moving the history pointer back changed the registered model from `S:1` (extrusion) to `S:0` (plane); moving it forward regenerated `S:1`. These are narrow smoke checks, not proof of all CAD operations, geometry correctness or desktop integration.

The checked-in Cypress craft suite contains `only` selectors in `test/coreTests/testCases/craftCut.js`, so its ordinary run excludes the other cases. Remove the selectors in a temporary test copy when trying the complete suite. Its old Cypress/Electron runner is being investigated; do not report a full-suite pass without a completed run.

## Desktop integration still required

Project and sketch data currently use browser `localStorage`, and the app's built-in file and project interface needs to be connected to the signed-in desktop file service with account isolation. Resource paths, external requests, cleanup, touch, accessibility, embedding policy, and larger models also need review. Preserve independent windows and each window's modeling state. Do not commit installed dependencies or generated build output.
