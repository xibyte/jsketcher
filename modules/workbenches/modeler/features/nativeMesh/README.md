# Native Mesh modeling (experimental)

The modeler provides two deliberately separate operations: **Native Mesh Box**
and **Native Mesh Boolean**. A Native Mesh Box creates a simple axis-aligned
rectangular solid. The Boolean operation combines two native mesh solids and
keeps its operation history in the ordinary project. Union, subtract and
intersection are available. Empty results are rejected with the originals
preserved. The native representation uses finite-precision triangle meshes.

Existing OCC modeling tools continue to use the OpenCascade BREP engine.
Native Mesh and OCC operands cannot currently be mixed or converted; selecting
a Native Mesh solid for an OCC operation or an OCC solid for a Native Mesh
Boolean must produce a clear error. This is not a global engine switch and does
not offer native arbitrary sketches, curved primitives, hole/shell/fillet, or
cross-engine conversion. Identifiers are stable for a rebuild with unchanged
topology; topology-changing edits may change face or edge identities.

This research integration requires the separately source-built CSP-compatible
Manifold assets and normal host project persistence. The isolated Chromium host test exercises the desktop wizard, history,
validation, engine guards, and save/reopen against an in-memory My files
stand-in. Real registered-account storage, physical phone interaction, broader
Boolean geometry and cross-engine behavior need qualification before presenting
it as a reliable modeling workflow. Numerical behavior may
differ from OCC, especially near thin overlaps and coincident geometry.
