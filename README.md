JS.Sketcher
===========

JS.Sketcher is a **parametric** 2D and 3D CAD modeler written in pure javascript
  
Current Status
==============

I created this tool for rapid designing of 3d models for my 3D-printer.  
The project is still a proof-of-concept(POC) and UI isn't perfect yet. 
Although a lot of work done and following core components are implemented:

* Geometric Constraint Solver. This is a most crucial component which allows to solve a system of geometric constraints applied to a sketch. 
  See below the list of supported constraints
* 2D Sketcher. Allows to design 2d sketches applying geometric constraints. Uses HTML5 canvas for rendering.      
* 3D Modeller. Is used for solid modelling. Uses 2D sketches to perform **EXTRUDE** and **CUT** operations on faces of a solid object. Uses WebGL and THREE.js for rendering
* 3D modeller supports navigation over history of modifications where parameters of the craft operations(extrude/cut) could be changed and reapplied again   
* Export to **STL**, **DWG** and **SVG** formats
* Saving projects in the browser locale storage
* Repository of dimensions. For example if there is a line length constraint applied, it's not necessary to hardcode some length value. 
  A dimension with a symbolic name can be created and the constraint can refer to that dimension by name. 
  Once value of dimension gets changed the sketch is resolved again accordingly to the new dimension values.  
* 2D measurement tool. Allows adding dimensions on a 2D drawing(Linear, Vertical, Horizontal and Arc/Circle dimension are supported)
* No any server-side needed. Only client side Javascript. 

This modeller is already used for:

* Designing of 3d models to get them 3d-printed. 3D models are based on parametric 2d sketches. All models can be exported as an STL file and 3d-printed after.     
* Creating of 2d parametric sketches which could be exported to DWG or SVG format.   

Demo Screencast
===============

TBD

Supported Constraints
=====================

* Coincident [web/img/coi.png]
* Vertical [web/img/vert.png]
* Horizontal [web/img/hor.png]
* Parallel [web/img/par.png]
* Perpendicular [web/img/per.png]
* Point to Line Distance [web/img/p2l.png]
* Point to Object Distance [web/img/p2p.png]
* Entity Equality(radius/length) [web/img/eq.png]
* Tangent [web/img/tgn.png]
* Radius [web/img/rad.png]
* Point On Line [web/img/vec/pointOnLine.svg]
* Point On Arc [web/img/vec/pointOnArc.svg)]
* Point In Middle [web/img/vec/pointInMiddle.svg]
* llAngle [web/img/vec/angle.svg]
* Symmetry [web/img/vec/symmetry.svg]
* Lock Convexity [web/img/vec/convex.svg]
* Fillet Meta Constraint [web/img/vec/fillet.svg]

