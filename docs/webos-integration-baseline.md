# WebOS integration baseline

This is the independently maintained CodiServer fork. Its Git remote is the LAN box-git repository; changes suitable for the original project can be proposed separately. The browser desktop integration is not yet complete or deployed.

## Initial browser checks

On the original fork baseline `c1905c4f9df9711206866c8b39e982f52d598d88`, a local production-style build was served to Chromium. The application loaded its own `jsketcher-occ-engine` WebAssembly asset. Using the project's existing modeling test helpers, a plane was created, a rectangle drawn as a constrained sketch, and an extrusion generated a solid. Project JSON stored the plane and extrusion history; sketch JSON stored the four segments and their coincident constraints. A reload restored the history and sketch and regenerated the solid. Moving the history pointer back changed the registered model from `S:1` (extrusion) to `S:0` (plane); moving it forward regenerated `S:1`. These are narrow smoke checks, not proof of all CAD operations, geometry correctness or desktop integration.

The checked-in Cypress craft suite contains `only` selectors in `test/coreTests/testCases/craftCut.js`, so its ordinary run excludes the other cases. Remove the selectors in a temporary test copy when trying the complete suite. Its old Cypress/Electron runner is being investigated; do not report a full-suite pass without a completed run.

## Desktop integration still required

Project and sketch data currently use browser `localStorage`, and the app's built-in file and project interface needs to be connected to the signed-in desktop file service with account isolation. Resource paths, external requests, cleanup, touch, accessibility, embedding policy, and larger models also need review. Preserve independent windows and each window's modeling state. Do not commit installed dependencies or generated build output.

A focused run of five upstream craft cases was made with the accidental `only` selectors removed and the asynchronous setup timeout increased from 4 to 60 seconds. The plane case passed; extrusion and cut cases raised `Cannot read property 'near' of null` during test-simulated ray picking, revolve timed out, and boolean intersection raised an undefined-value error. This is not a full-suite pass, and these results do not establish whether each problem is in the harness or the interactive application. The baseline app's `customRaycast` constructs a Three.js raycaster without assigning its camera; testing a possible fix is in progress. The separate Chromium rectangle-extrusion/reload/history smoke check described above did pass.

A temporary experiment assigned the current camera to that raycaster. It avoided the original null-camera exception, but the two focused extrusion and cut cases then timed out at 60 seconds. The experiment has not been adopted; further investigation is needed.
