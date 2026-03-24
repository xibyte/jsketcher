We are customising jsketcher to make a easy to use cad app similar to fusion and shapr3d
Only tools needed are solid toolas and sketcher


- Tools needed: Sketch, Solid tools, File manager
- Running locally: http://localhost:3000 via `npm start`
- Location: C:\Users\Lenovo\jsketcher
- Original unmodified files: C:\Users\Lenovo\jsketcher-original (use for comparison when needed)

## Rules for Claude
- Dont make changes you are not asked to
- One change at a time
- Don't move things that aren't broken
- Before starting any feature that touches core navigation, storage, or URL handling — warn the user first
- Always warn if a feature is complex, time consuming or risky before starting

## Good to know

### Dark/Medium/Light Theme System
- Theme applied via CSS variables on document root
- Themes defined and applied in SettingsPanel.jsx
- All theme variables in: modules/ui/styles/theme.less

### Layout
- Top toolbar stretches full width
- Left sidebar icons overlay viewport (position absolute, no background)
- FloatView panel opens as overlay
- Key file: web/app/cad/dom/components/View3d.jsx
- Key file: web/app/cad/dom/components/FloatView.less

### Top Toolbar
- Key file: modules/workbenches/modeler/index.ts
- Top toolbar: streams.ui.toolbars.headsUp

### Deselect All
- Key file: web/app/cad/actions/coreActions.js

### File Menu
- Clone Project removed (available in Projects panel)
- Key file: web/app/cad/workbench/menuConfig.js

### Settings Panel
- Key file: web/app/cad/dom/components/SettingsPanel.jsx
- Key file: web/app/cad/dom/components/SettingsPanel.less

### NavCube
- Custom Three.js nav cube with home button (top right)
- Key file: web/app/cad/dom/components/NavCube.tsx

### Grid
- Three.js GridHelper, saved reference as this.grid in SceneSetup
- Key file: modules/scene/sceneSetup.ts

### Move/Rotate Body
- MoveBodySimpleOperation and RotateBodySimpleOperation added
- Labels: "Move Body" and "Rotate"
- Key file: modules/workbenches/modeler/features/moveBody/
- Rotate uses bounding box centroid as pivot when "Rotate around body center" is checked
- Axis selection is X/Y/Z radio buttons (not number inputs)

### Chamfer
- Separated from Fillet in toolbar
- Both appear as separate buttons

### Project Manager
- Stock jsketcher ProjectManager used
- Key file: web/app/cad/projectManager/ProjectManager.jsx

### Left Sidebar (FloatView)
- Three tabs: Modifications, Scene(replicates tree from fusion 360) and Projects
- Key file: web/app/cad/dom/components/FloatView.jsx
- Left sidebar uses FloatView component
- Register panels with: services.ui.registerFloatView(id, Component, title, icon

### Measure Tool
- Key file: modules/workbenches/modeler/actions/measure/measure.action.ts
- Shapr3D-style snap: hover face → see all snap dots, click nearest

### Split Body
- Key file: modules/workbenches/modeler/features/splitBody/splitBody.operation.ts
- Uses OCC `bapisplit` + `explode` + try/catch loop to extract result shells
- Tool is an MShell (NOT MFace) — face ptrs don't carry the parent solid's translation; body ptrs do
- Both body and tool pushed via `occ.io.pushModel()` before OCI commands
- `_SPI_splitByPlane` does NOT exist in the WASM binary — do NOT use it
- Pattern: push body as `__SplitBody__`, face as `__SplitTool__`, then `bclearobjects/bcleartools/baddobjects/baddtools/bfillds/bapisplit/explode Sh`, read back `SplitResult_1..N`

### Default Scene
- Fresh project loads with 2 boxes (50×50×50), S:1 moved X+60 Z+60
- Key file: web/app/cad/projectBundle.ts — default history in `load()` when no stored data

## BRep Data Structure — Key Discoveries
- `brepFace.outerLoop.halfEdges` — array of HalfEdge for the outer boundary loop
- `brepFace.innerLoops` — array of inner hole loops (separate from outerLoop)
- `brepFace.surface.point(u, v)` — evaluates point ON the surface at parametric coords
- `brepFace.surface.uMid`, `vMid` — mid-parameters, computed as `(uMax - uMin) * 0.5` (assumes uMin=0)
- `brepEdge.curve.point(u)` — returns a `Vector` (Point with .x .y .z), NOT an array
- `brepEdge.curve.middlePoint()` — cached midpoint, evaluates at `uMid`
- `brepEdge.curve.uMin`, `uMax` — set from `impl.domain()` in constructor, parameters start from 0 typically
- `face.loops` is an ITERABLE not an array — `loops[0]` does NOT work
- `View.SUPPRESS_HIGHLIGHTS` — static bool on View class; suppresses all highlight visuals when true

## Pending Features
- Various Theme and app tweaks
- STL/STEP export with unit selector (mm/cm/m/inch), jsketcher has no units. 
- Electron packaging for real local file system on Windows Linux and Mac

## Checklist (known issues / future work)
- [ ] **Tessellation quality for primitives** — Sphere/box/cylinder look faceted because `_SPI_sphere` and other primitive WASM ops ignore the `deflection` param (not in their C++ API). The `tessellate({model: ptr, deflection})` engine call exists and returns `{faces: [{positions, indices, normals}], edges}` but its format differs from what `readBrep` expects. Need to inject retessellation before `readBrep` reads the data, or patch the WASM C++ to accept deflection in primitive ops.
-