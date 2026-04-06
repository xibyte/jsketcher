# Changelog

All notable changes to ArcCAD (fork of jsketcher) are documented in this file.

## [0.1.0] - 2024

### 3D Workspace

#### Added
- **Toolbar**: Complete solid tools with dark/medium/light themes and colored/mono icon options
- **Sidebar (FloatView)**: History, scene tree, and projects panels with transparent overlay and CSS variable-based layout (`--floatview-width`)
- **Settings Panel**: Draggable panel with antialiasing toggle and tessellation quality settings (Low/Medium/High/Ultra)
- **Solid Tools**:
  - Move Body
  - Rotate Body
  - Split Body
  - Measure Tool
- **WASM Improvements**: Rebuilt with smooth spheres, STEP/STL export support, PushPullFace operation
- **Direct Edit**: Click face → push/pull handle; Click edge → fillet (+) / chamfer (−)
  - HUD is draggable
  - Right-click pans without cancelling the active handle
- **3D Pan**: Improved `panCamera()` using proper screen-space calculations (`right = eye × up`, `screenUp = right × eye`)

### Sketcher — UI & Layout

#### Added
- **Toolbar**: Line, rectangle, circle variants, arc, ellipse, bezier, polygon, trim, offset, mirror, measures, constraints dropdown
- **Constraints Dropdown**: 3-column grid layout, centered below button, flips up when near screen bottom
- **Contextual Controls**: Fixed panel on right edge showing available actions and constraint participation on selection
- **Side Panels**: Objects + Constraints panels on left edge with collapse toggle
- **Sketch Grid**: Canvas-drawn grid with visibility toggle (default: visible=true, snap=false, step=10)
- **3D Grid**: Auto-hidden when entering sketch mode
- **Settings Panel**: Gear button opens settings below toolbar, closes on sketch exit

### Sketcher — Tool Active State

#### Added
- Active tool icon highlighting in toolbar
- Click tool again to deselect (returns to pan mode)
- **Persistent Invoke**: `ToolManager.setPersistentInvoke()` keeps tool active after placing each shape
- `activeSketcherToolId` state stream for tracking active tool
- `setOnDeselect()` callback on ToolManager for cleanup when tool is truly deselected

### Sketcher — ESC Cancellation

#### Added
- **ESC press 1** (drawing in progress): Calls `tool.cancelCurrent()` → removes unfinished shape, calls `restart()`, returns `true`. Tool stays selected.
- **ESC press 2** (nothing in progress): `cancelCurrent()` returns `false` → clears persistent invoke, calls `_onDeselect()`, takes control of default tool.
- **Canvas Focus**: `takeControl()` and segment tool properly focus canvas
- **Checkpoint Tools** (circle, arc, polygon, etc.): Cancel via `historyManager.undo()`
- **Non-checkpoint Tools** (segment, rectangle, etc.): Cancel via `viewer.remove()`

### Sketcher — Dimension Input

#### Added
- Floating dimension input box near cursor after placing a shape
- Supported fields: R (radius), L (length), W/H (width/height), D (diameter), Rx/Ry (ellipse radii), A° (angle)
- Field option `allowNegative: true` for angle fields
- On confirm, adds `AlgNumConstraint` for later editing
- **Segment Tool**: Shows L + A° fields; multi-line shows input after each segment
- Relative angle for multi-line subsequent segments (angle from previous segment direction)
- Cancel properly triggers undo/remove based on tool type

### Sketcher — Live Angle Hint

#### Added
- `$angleHint` state stream for showing angle near cursor while drawing
- `AngleHint` component rendered as fixed label
- Segment tool sets angle hint in mousemove; cleared on cleanup/restart
- Absolute angle for first segment, relative angle for multi-line subsequent segments

### Sketcher — Constraint Editing

#### Added
- Click constraint in Constraints panel OR double-click annotation on canvas → opens `ConstraintEditor`
- Always call `viewer.parametricManager.constraintUpdated(c)` + `viewer.refresh()` after applying values
- Constraint actions (Length, Radius, Angle): Edit existing if present, add new if not (prevents duplicates)
- **EllipseRadius Constraint**: New constraint in `ANConstraints.ts` constraining both `rx` and `ry` via linear polynomials
- Works for both Ellipse and EllipticalArc

### Sketcher — Objects Panel

#### Added
- Eye icon toggles visibility
- `setObjectVisibility(obj, visible)` sets visibility recursively on children (endpoint points)
- Hides matching dimension layer annotations
- **Rectangle Groups**: 4 segments tagged with shared `rectGroup` ID; Explorer collapses them into one "Rectangle" row
- Icons derived from `object.TYPE` via inline SVG map

### Sketcher — Constraints Panel

#### Added
- Constraints grouped by sketch object with collapsible dropdowns (default open)
- Rect groups default collapsed
- `mapObjAndPoints` maps shape ID + endpoint IDs → group for coincidence constraints
- Uncategorised constraints shown at bottom

### Sketcher — Trim Tool

#### Added
- Highlights full hovered segment in tool color
- Red overlay preview of portion that would be removed
- Uses `viewer._paintOverlay` callback drawn at end of `repaint()`
- `_getTrimPreview` uses `segSegIntersectTRelaxed` (allows t at 0/1) for preview
- Actual trim uses strict `segSegIntersectT` (t: 0.001–0.999) to avoid cutting at endpoints

### Architecture & Layout

#### Changed
- **CSS Variables**: All toolbar sizing driven by CSS custom properties (`--toolbar-icon-size`, `--toolbar-text-size`, `--toolbar-spacing`)
- **Sketcher Overrides**: Overrides CSS vars directly on `#top-toolbar` via inline styles; removed on sketch exit
- **Pointer Events**: `.mainLayout` has `pointer-events: none`; interactive panels explicitly set `pointerEvents: 'auto'`
- **FloatView Layout**: Uses `--floatview-width` CSS var (37px closed / 272px open) to push `middleSection` content right

#### Fixed
- **Coordinate Handling**: `viewer2d.screenToModel(e)` properly reads `e.offsetX` / `e.offsetY`
- **Snap Handling**: `viewer.snapped` correctly set from `captured.tool[0]` without highlight pollution
- **Selection Priority**: `traversePickResults` prioritizes EDGE over FACE (outer loop = picker types, inner = hit results)

### Known Issues / TODO

- Push/Pull on cylinder side faces
- Push/Pull on hole bottom faces
- Push/Pull on hole side faces
- Undo/redo buttons (UI only)
- Export UI button (C++ and JS done)
- Electron packaging

---

## Original jsketcher

This project is a fork of [jsketcher](https://github.com/xibyte/jsketcher) by Val Erastov. Original project created the foundation for parametric CAD in the browser with React and Three.js.
