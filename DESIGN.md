
### Goal

Re-architect the CAD system to use a **hybrid mesh + parametric (BRep-derived) approach**, where:

* The **mesh is the source of truth for rendering and boolean operations**
* The **parametric BRep data is only used as an origin reference**, not actively maintained

---

### Core Concepts & Terminology

#### 1. Topology Layer (BRep)

* Located in: `modules/brep/topo`
* Classes: `TopoObject`, `Face`, `Edge`, `Vertex`
* Purpose:

  * Define **initial parametric geometry**
  * Used **only when creating primitives**
  * NOT updated during boolean operations

---

#### 2. Modelling Layer (MObjects)

* Located in: `web/app/cad/model`

* Classes:

  * `MObject` (base)
  * `MFace`
  * `MEdge`
  * `MVertex`
  * `MShell`

* Purpose:

  * Represent **renderable and editable geometry**
  * Own the **mesh + references to parametric origins**

---

### New Architecture

#### 1. Shared Mesh per Entity

* Each high-level entity (solid/shell/face group) has:

  * A **single shared mesh**

    * Vertex buffer
    * Triangle indices

* `MObject`

  * Stores: `mesh: Mesh` - object representing(beffer and triangle indices)

---

#### 2. Parametric Origins

* Each `MObject` keeps a reference to its origin:

  * Example:

    ```ts
    brepFace: Face
    brepEdge: Edge
    brepVertex: Vertex
    ```

* Add support for merged entities:

  ```ts
  origins: MObject[] // optional, for boolean merges
  ```

---

#### 3. Mesh Referencing

Each modelling object references the shared mesh:

* `MFace`

  * Stores: `triangleIndices: number[]`

* `MEdge`

  * Stores: `vertexIndices: number[]` (polyline along mesh)

* `MVertex`

  * Stores: `vertexIndex: number`

---

#### 4. Primitive Creation Flow

1. Create parametric surfaces/curves (NURBS)
2. Build BRep topology (faces, edges, vertices)
3. Triangulate into mesh
4. Create MObjects:

   * Attach mesh references
   * Attach BRep origin references

---

### Boolean Operations (Key Design)

#### Principles

* ❗ No new parametric surfaces are created
* ✅ Only:

  * Intersection curves (already available, surfaceIntersectionCurve.ts)
  * Intersection vertices

---

#### Boolean Algorithm Overview

1. **Compute Intersections**

   * For each face-face pair:

     * Compute intersection curves (parametric)
     * Compute intersection vertices

---

2. **Map to Mesh**

   * Detect intersecting triangles
   * Extract **mesh edges** along intersection boundaries

---

3. **Edge Grouping (Critical Step)**

   * Input: small mesh edge segments
   * Process:

     * Group into **continuous edge chains**
   * Output:

     * New `MEdge` objects
     * Each linked to:

       * Corresponding **intersection curve**

---

4. **Face Reconstruction**

   * Use triangle subsets to define new `MFace`s

---

5. **Result Assembly**

   * Output:

     ```ts
     MShell {
       mesh
       faces: MFace[]
       edges: MEdge[]
       vertices: MVertex[]
     }
     ```

---

### Rendering

* Render **directly from the modelling mesh**
* Do NOT rely on BRep for rendering
* Update rendering pipeline to consume:

  * Shared mesh
  * MObject groupings

---

### Important Constraints

* ❗ BRep topology is **not maintained after primitive creation**
* ❗ Boolean operations operate **purely on mesh + intersection data**
* ❗ BRep is **read-only origin metadata**

---

### Notes / Edge Cases

* When faces or edges merge:

  * Keep one primary origin
  * Store others in:

    ```ts
    origins: MObject[]
    ```

---

## Optional: Short Version (if you want Claude to act faster)

If you want a tighter version for execution:

> Build a hybrid CAD system where:
>
> * Mesh is the primary representation
> * BRep is only used to generate primitives and store origin references
> * Each MObject references:
>
>   * Shared mesh (indices)
>   * Original parametric entity
>
> Boolean ops:
>
> * Do NOT create new surfaces
> * Compute intersections (curves + vertices)
> * Map intersections onto mesh
> * Group mesh edge segments into continuous edges
> * Reconstruct faces from triangle subsets
>
> Output is a new MShell with mesh + grouped MObjects.
> Rendering uses mesh only.

Identity & ID Management (New)
❗ Remove:
productionAnalyzer
NativeClassifier
Reason:
During CSG operations, topological identity is preserved directly
Faces, edges, and vertices can be tracked through mesh + grouping logic
Stable ID Rules
Each MObject must have a stable ID
During boolean operations:
If an entity is unchanged → keep its ID
If an entity is split or merged:
Generate new stable IDs

ID generation should follow principles from:

web/app/cad/craft/production/productionAnalyzer.ts
Suggested approach:
Derive IDs from:
Source IDs (parents)
Operation type (split / merge)
Local topology (e.g., edge loop or triangle cluster signature)