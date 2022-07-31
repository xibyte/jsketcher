export interface OCCCommands {
  /*
     2dbeziercurve name nbpole pole, [weight]
   */
  _2dbeziercurve(...args: any[]);

  /*
     2dbsplinecurve name degree nbknots  knot, umult  pole, weight
   */
  _2dbsplinecurve(...args: any[]);

  /*
     2dcvalue curvename U  X Y [D1X D1Y D2X D2Y]
   */
  _2dcvalue(...args: any[]);

  /*
     lmirror name [names...] x y dx dy
   */
  _2dlmirror(...args: any[]);

  /*
     2dpbsplinecurve name degree nbknots  knot, umult  pole, weight (periodic)
   */
  _2dpbsplinecurve(...args: any[]);

  /*
     pmirror name [names...] x y
   */
  _2dpmirror(...args: any[]);

  /*
     2dprofile, no args to get help
   */
  _2dprofile(...args: any[]);

  /*
     pscale name [names...] x y s
   */
  _2dpscale(...args: any[]);

  /*
     rotate name [names...] x y dx dy  angle
   */
  _2drotate(...args: any[]);

  /*
     translate name [names...] dx dy
   */
  _2dtranslate(...args: any[]);

  /*
     Calcul d'intersection entre face et curve : BRepIntCS curve1 [curve2 ...] shape [res] [tol]
   */
  BRepIntCS(...args: any[]);

  /*
     Generic webcad engine command
   */
  EngineCommand(...args: any[]);

  /*
     XProgress [+|-t] [+|-c] [+|-g]
		 The options are:
		   +|-t :  switch on/off output to tcl of Progress Indicator
		   +|-c :  switch on/off output to cout of Progress Indicator
		   +|-g :  switch on/off graphical mode of Progress Indicator
   */
  XProgress(...args: any[]);

  /*
     add what where
  adds shape "what" to shape "where"
   */
  add(...args: any[]);

  /*
     addpcurve edge 2dcurve face [tol (default 1.e-7)]
   */
  addpcurve(...args: any[]);

  /*
     addpolygonnode polygon3d(2d) x y [z]
   */
  addpolygonnode(...args: any[]);

  /*
      Adds sliding elements : addslide prism/revol/pipe edge face [edge face...]
   */
  addslide(...args: any[]);

  /*
     addsweep wire [vertex] [-M ] [-C] [auxiilaryshape]:no args to get help
   */
  addsweep(...args: any[]);

  /*
     approxcurve [-L] name curve1 [Surf1] [curve2d2 Surf2] [Tol [cont [maxdeg [maxseg]]]]
   */
  approxcurve(...args: any[]);

  /*
     approxcurveonsurf name curve2d surface [Tol [cont [maxdeg [maxseg]]]]
   */
  approxcurveonsurf(...args: any[]);

  /*
     approxplate result nbrpntoncurve nbrcurfront edge face tang (0:vif;1:tang) ... tol nmax degmax crit
   */
  approxplate(...args: any[]);

  /*
     approxsurf name surf [Tol [CnU CnV [degU degV [nmax]]]]
   */
  approxsurf(...args: any[]);

  /*
     appsurf result C1 C2 C3 .....:
	Create a surface passing through the curves
   */
  appsurf(...args: any[]);

  /*
     attachpcurve eold enew face
   */
  attachpcurve(...args: any[]);

  /*
     use b2dclassifx Face Point2d [Tol]
   */
  b2dclassifx(...args: any[]);

  /*
     use b2dclassify Face Point2d [Tol] [UseBox] [GapCheckTol]
Classify  the Point  Point2d  with  Tolerance <Tol> on the face described by <Face>.
<UseBox> == 1/0 (default <UseBox> = 0): switch on/off the use Bnd_Box in the classification.
<GapCheckTol> (default <GapCheckTol> = 0.1): this is for additional verification of
the vertex with a tolerance >= <GapCheckTol>.
   */
  b2dclassify(...args: any[]);

  /*
     Command for adding multiple objects for Boolean/GF/Split/Cells operations grouped in one object.
		Given object will be exploded on first level sub-shapes and each of these sub-shapes will act as a separate object.
		The command has cumulative effect, thus can be used several times for single operation.
		For new operation the objects have to be cleared by bclearobjects or bclear commands.
		Usage: baddcompound c
   */
  baddcompound(...args: any[]);

  /*
     Command for adding multiple tools for Boolean/GF/Split/Cells operations grouped in one object.
		Given object will be exploded on first level sub-shapes and each of these sub-shapes will act as a separate tool.
		The command has cumulative effect, thus can be used several times for single operation.
		For new operation the tools have to be cleared by bcleartools or bclear commands.
		Usage: baddctools c
   */
  baddctools(...args: any[]);

  /*
     Adds objects for Boolean/GF/Split/Cells operations.
		The command has cumulative effect, thus can be used several times for single operation.
		For new operation the objects have to be cleared by bclearobjects or bclear commands.
		Usage: baddobjects s1 s2 ...
   */
  baddobjects(...args: any[]);

  /*
     Adds tools for Boolean/GF/Split/Cells operations.
		The command has cumulative effect, thus can be used several times for single operation.
		For new operation the tools have to be cleared by bcleartools or bclear commands.
		Usage: baddtools s1 s2 ...
   */
  baddtools(...args: any[]);

  /*
     Builds the result of Boolean operation using top level API.
		Objects for the operation are added using commands baddobjects and baddtools.
		Usage: bapibop r operation
		Where:
		result - name of the result shape
		op - type of Boolean operation. Possible values:
		     - 0/common - for Common operation
		     - 1/fuse - for Fuse operation
		     - 2/cut - for Cut operation
		     - 3/tuc/cut21 - for Cut21 operation
		     - 4/section - for Section operation
   */
  bapibop(...args: any[]);

  /*
     Builds the result of General Fuse operation using top level API.
		Objects for the operation are added using commands baddobjects and baddtools.
		Usage: bapibuild result
   */
  bapibuild(...args: any[]);

  /*
     Builds the result of Split operation using top level API.
		Objects for the operation are added using commands baddobjects and baddtools.
		Usage: bapisplit result
   */
  bapisplit(...args: any[]);

  /*
     Builds the result of Boolean operation. Intersection (bfillds) has to be already performed by this moment.
		Usage: bbop result op [-t]
		Where:
		result - name of the result shape
		op - type of Boolean operation. Possible values:
		     - 0/common - for Common operation
		     - 1/fuse - for Fuse operation
		     - 2/cut - for Cut operation
		     - 3/tuc/cut21 - for Cut21 operation
		     - 4/section - for Section operation
		-t - optional parameter for enabling timer and showing elapsed time of the operation
   */
  bbop(...args: any[]);

  /*
     Builds the result of General Fuse operation. Intersection (bfillds) has to be already performed by this moment.
		Usage: bbuild result [-t]
		Where:
		result - name of the result shape
		-t is the optional parameter for enabling timer and showing elapsed time of the operation
   */
  bbuild(...args: any[]);

  /*
     Add parts to result. Use: bcadd r s1 (0,1) s2 (0,1) ... [-m material [-u]]
   */
  bcadd(...args: any[]);

  /*
     Add all parts to result. Use: bcaddall r [-m material [-u]]
   */
  bcaddall(...args: any[]);

  /*
     Cells builder. Use: bcbuild r
   */
  bcbuild(...args: any[]);

  /*
     Enables/Disables the check of the input solids on inverted status in BOP algorithms
		Usage: bcheckinverted 0 (off) / 1 (on)
   */
  bcheckinverted(...args: any[]);

  /*
     use bclassify Solid Point [Tolerance=1.e-7]
   */
  bclassify(...args: any[]);

  /*
     Clears both objects and tools previously added for Boolean/GF/Split/Cells operations.
		Usage: bclear
   */
  bclear(...args: any[]);

  /*
     Clears the objects previously added for Boolean/GF/Split/Cells operations.
		Usage: bclearobjects
   */
  bclearobjects(...args: any[]);

  /*
     Clears the tools previously added for Boolean/GF/Split/Cells operations.
		Usage: bcleartools
   */
  bcleartools(...args: any[]);

  /*
     Make containers from the parts added to result. Use: bcmakecontainers r
   */
  bcmakecontainers(...args: any[]);

  /*
     use bcommon r s1 s2
   */
  bcommon(...args: any[]);

  /*
     Remove parts from result. Use: bcremove r s1 (0,1) s2 (0,1) ...
   */
  bcremove(...args: any[]);

  /*
     Remove all parts from result. Use: bcremoveall
   */
  bcremoveall(...args: any[]);

  /*
     Remove internal boundaries. Use: bcremoveint r
   */
  bcremoveint(...args: any[]);

  /*
     use bcut r s1 s2
   */
  bcut(...args: any[]);

  /*
     bcutblend result shape1 tool radius [-d]
   */
  bcutblend(...args: any[]);

  /*
     Enables/Disables drawing of warning shapes of BOP algorithms.
		Usage: bdrawwarnshapes 0 (do not draw) / 1 (draw warning shapes)
   */
  bdrawwarnshapes(...args: any[]);

  /*
     beziercurve name nbpole pole, [weight]
   */
  beziercurve(...args: any[]);

  /*
     beziersurf name nbupoles nbvpoles pole, [weight]
   */
  beziersurf(...args: any[]);

  /*
     Performs intersection of the arguments added for the operation by baddobjects and baddtools commands.
		Usage: bfillds [-t]
		Where: -t is the optional parameter for enabling timer and showing elapsed time of the operation
   */
  bfillds(...args: any[]);

  /*
     use bfuse r s1 s2
   */
  bfuse(...args: any[]);

  /*
     bfuseblend result shape1 shape2 radius [-d]
   */
  bfuseblend(...args: any[]);

  /*
     Sets the additional tolerance for BOP algorithms.
		Usage: bfuzzyvalue value
   */
  bfuzzyvalue(...args: any[]);

  /*
     Sets the gluing mode for the BOP algorithms.
		Usage: bglue [0 (off) / 1 (shift) / 2 (full)]
   */
  bglue(...args: any[]);

  /*
     use bhaspc Edge Face [do]
   */
  bhaspc(...args: any[]);

  /*
     alias to readbrep command
   */
  binrestore(...args: any[]);

  /*
     binsave shape filename
   */
  binsave(...args: any[]);

  /*
     bisec result line/circle/point line/circle/point
   */
  bisec(...args: any[]);

  /*
     blend result object rad1 ed1 rad2 ed2 ... [R/Q/P]
   */
  blend(...args: any[]);

  /*
     blend1 result object rad ed1  ed2 ...
   */
  blend1(...args: any[]);

  /*
      Performs the blind hole : blindhole result shape Or.X Or.Y Or.Z Dir.X Dir.Y Dir.Z Radius Length
   */
  blindhole(...args: any[]);

  /*
     bmirror name x y z dx dy dz
   */
  bmirror(...args: any[]);

  /*
     bmove name1 name2 ... name, set location from name
   */
  bmove(...args: any[]);

  /*
     Enables/Disables the safe processing mode.
		Usage: bnondestructive 0/1
   */
  bnondestructive(...args: any[]);

  /*
     use bop s1 s2
   */
  bop(...args: any[]);

  /*
     Use >bopaddpcs Shape
   */
  bopaddpcs(...args: any[]);

  /*
     Checks the validity of shape/pair of shapes.
		Usage: bopapicheck s1 [s2] [-op common/fuse/cut/tuc] [-se] [-si]
		Options:
		s1, s2 - shapes for checking;
		-op - specifies the type of Boolean operation, for which the validity of shapes should be checked; Should be followed by the operation;
		-se - disables the check of the shapes on small edges;
		-si - disables the check of the shapes on self-interference.

   */
  bopapicheck(...args: any[]);

  /*
     use bopargcheck without parameters to get
   */
  bopargcheck(...args: any[]);

  /*
     Splits the face by set of shared edges. Use: bopbface fr cx
   */
  bopbface(...args: any[]);

  /*
     Build solids from set of shared faces. Use: bopbsolid sr cx
   */
  bopbsolid(...args: any[]);

  /*
     Shows information about common blocks. Use: bopcb [#e]
   */
  bopcb(...args: any[]);

  /*
     use bopcheck Shape [level of check: 0 - 9] [-t]
   */
  bopcheck(...args: any[]);

  /*
     use bopcommon r
   */
  bopcommon(...args: any[]);

  /*
     use bopcurves F1 F2 [-2d/-2d1/-2d2] [-p u1 v1 u2 v2 (to add start points] [-v (for extended output)]
   */
  bopcurves(...args: any[]);

  /*
     use bopcut r
   */
  bopcut(...args: any[]);

  /*
     Shows the shapes from DS. Use: bopds [v/e/w/f/sh/s/cs/c]
   */
  bopds(...args: any[]);

  /*
     Shows information about alone vertices for the face. Use: bopfav #f
   */
  bopfav(...args: any[]);

  /*
     Shows IN information for the face. Use: bopfin #f
   */
  bopfin(...args: any[]);

  /*
     Shows ON information for the face. Use: bopfon #f
   */
  bopfon(...args: any[]);

  /*
     Shows SC information for the face. Use: bopfsc #f
   */
  bopfsc(...args: any[]);

  /*
     Shows SD faces for the face: Use: bopfsd f
   */
  bopfsd(...args: any[]);

  /*
     use bopfuse r
   */
  bopfuse(...args: any[]);

  /*
     Shows split parts of the shape. Use: bopimage s
   */
  bopimage(...args: any[]);

  /*
     Gets the index of the shape in the DS. Use: bopindex s
   */
  bopindex(...args: any[]);

  /*
     Shows interferences of given type. Use: bopinterf type1 type2
   */
  bopinterf(...args: any[]);

  /*
     Shows the pairs of interfered shapes. Use: bopiterator [type1 type2]
   */
  bopiterator(...args: any[]);

  /*
     Shows the newly created shapes. Use: bopnews [v,e,f]
   */
  bopnews(...args: any[]);

  /*
     Shows the original shape for the shape. Use: boporigin s
   */
  boporigin(...args: any[]);

  /*
     Shows information about pave blocks. Use: boppb [#e]
   */
  boppb(...args: any[]);

  /*
     Shows the section curves. Use: bopsc [nF1 [nF2]]
   */
  bopsc(...args: any[]);

  /*
     Gets the Same domain shape. Use: bopsd #
   */
  bopsd(...args: any[]);

  /*
     use bopsection r
   */
  bopsection(...args: any[]);

  /*
     Shows the splits of edges. Use: bopsp [#e]
   */
  bopsp(...args: any[]);

  /*
     Usage: boptions [-default]
		w/o arguments shows current value of BOP options
		-default - allows setting all options to default values
   */
  boptions(...args: any[]);

  /*
     use boptuc r
   */
  boptuc(...args: any[]);

  /*
     Shows where the new shape was created. Use: bopwho #
   */
  bopwho(...args: any[]);

  /*
      Perform fillet on top and bottom edges of dprism :bossage dprism result radtop radbottom First/LastShape (1/2)
   */
  bossage(...args: any[]);

  /*
     bounding {shape | xmin ymin zmin xmax ymax zmax}
		:            [-obb] [-noTriangulation] [-optimal] [-extToler]
		:            [-dump] [-print] [-dumpJson] [-shape name] [-nodraw] [-finitePart]
		:            [-save xmin ymin zmin xmax ymax zmax]
		:
		: Computes a bounding box. Two types of the source data are supported:
		: a shape or AABB corners (xmin, ymin, zmin, xmax, ymax, zmax).
		:
		: Calculation options (applicable only if input is a shape):
		:  -obb     Compute Oriented Bounding Box (OBB) instead of AABB.
		:  -noTriangulation Force use of exact geometry for calculation
		:                   even if triangulation is present.
		:  -optimal Force calculation of optimal (more tight) AABB.
		:           In case of OBB:
		:           - for PCA approach applies to initial AABB used in OBB calculation
		:           - for DiTo approach modifies the DiTo algorithm to check more axes.
		:  -extToler Include tolerance of the shape in the resulting box.
		:
		: Output options:
		:  -dump    Prints the information about computed Bounding Box.
		:  -print   Prints the information about computed Bounding Box.
		:           It is enabled by default (with plain old syntax for AABB)
		:           if neither -shape nor -save is specified.
		:  -dumpJson Prints DumpJson information about Bounding Box.
		:  -shape   Stores computed box as solid in DRAW variable with specified name.
		:  -save    Stores min and max coordinates of AABB in specified variables.
		:  -noDraw  Avoid drawing resulting Bounding Box in DRAW viewer.
		:  -finite  Return finite part of infinite box.
   */
  bounding(...args: any[]);

  /*
     bounds S/C/C2d U1 U2 [V1 V2]
   */
  bounds(...args: any[]);

  /*
     box name [dx dy dz] [x y z dx dy dz]
		:            [-min x y z] [-size dx dy dz] [-max x y z]
		:            [-dir x y z -xdir x y z] [-preview]
		: Construct axes-aligned box and put result into 'name' variable
		:  -min   box lower corner, origin; (0,0,0) by default
		:  -size  box dimensions   (alternative to -max)
		:  -max   box upper corner (alternative to -size)
		:  -dir   main direction of coordinate system (DZ by default)
		:  -xdir  x direction of coordinate system (DX by default)
		:  -preview non-solid shape will be created (vertex, edge, rectangle or box);
		:           otherwise, return NULL shape in case of zero box dimension.
   */
  box(...args: any[]);

  /*
     use breducetolerance Shape
   */
  breducetolerance(...args: any[]);

  /*
     brollingball r S radius [stopf1 ..] @ [f1 f2 ..] @ [e1 ..]
   */
  brollingball(...args: any[]);

  /*
     brotate name1 name2 ... x y z dx dy dz angle
   */
  brotate(...args: any[]);

  /*
     Enables/Disables parallel processing mode.
		Usage: brunparallel 0/1
   */
  brunparallel(...args: any[]);

  /*
     bscale name x y z scale
   */
  bscale(...args: any[]);

  /*
     use bsection r s1 s2 [-n2d/-n2d1/-n2d2] [-na]Builds section between shapes. Options:
-n2d/-n2d1/-n2d2 - disable the PCurve construction;
-na - disables the approximation of the section curves.

   */
  bsection(...args: any[]);

  /*
     Enables/Disables the result simplification after BOP
		Usage: bsimplify [-e 0/1] [-f 0/1] [-a tol]
		-e 0/1 - enables/disables edges unification
		-f 0/1 - enables/disables faces unification
		-a tol - changes default angular tolerance of unification algo (accepts value in degrees).
   */
  bsimplify(...args: any[]);

  /*
     bsplinecurve name degree nbknots  knot, umult  pole, weight
   */
  bsplinecurve(...args: any[]);

  /*
     bsplineprof, no args to get help
   */
  bsplineprof(...args: any[]);

  /*
     bsplinesurf name udegree nbuknots  uknot, umult  vdegree nbvknots vknot, vmult pole, weight
   */
  bsplinesurf(...args: any[]);

  /*
     Builds the result of Split operation. Intersection (bfillds) has to be already performed by this moment.
		Usage: bsplit result [-t]
		Where:
		result - name of the result shape
		-t is the optional parameter for enabling timer and showing elapsed time of the operation
   */
  bsplit(...args: any[]);

  /*
     use btolx Shape [minTol=1.e-7]
   */
  btolx(...args: any[]);

  /*
     btranslate name1 name2 ... dx dy dz
   */
  btranslate(...args: any[]);

  /*
     use btuc r s1 s2
   */
  btuc(...args: any[]);

  /*
     build3d S [tol]
   */
  build3d(...args: any[]);

  /*
     Builds the result of BOP basing on the GF, thus bbuild command has to be already performed
		The command uses classification approach for building the result of BOP
		(thus it operates on solids only and can be used on open solids):
		 - FUSE is built from the faces OUT of all arguments
		 - COMMON is built from the faces IN any of the object/tools
		 - CUT is built from the objects faces OUT of the tools and tools faces IN the objects.
		Please note that history for solids will not be available.

		Usage: buildbop result -o s1 [s2 ...] -t s3 [s4 ...] -op operation (common/fuse/cut/tuc)
		Where:
		result      - result shape of the operation
		s1 s2 s3 s4 - arguments (solids) of the GF operation
		operation   - type of boolean operation
   */
  buildbop(...args: any[]);

  /*
     buildevol end of the evol fillet computation
   */
  buildevol(...args: any[]);

  /*
     buildfaces result faceReference wire1 wire2 ...
   */
  buildfaces(...args: any[]);

  /*
     buildpcurvesonplane shape
   */
  buildpcurvesonplane(...args: any[]);

  /*
     builsweep [r] [option] [Tol] , no args to get help
   */
  buildsweep(...args: any[]);

  /*
     Enables/disables the usage of OBB in BOP algorithms
		Usage: buseobb 0 (off) / 1 (on)
   */
  buseobb(...args: any[]);

  /*
     canceldenom BSpline-Surface UDirection(0/1) VDirection(0/1)
   */
  canceldenom(...args: any[]);

  /*
     cclearrepetitions [result]
		Clears all previous repetitions of the periodic shape.
   */
  cclearrepetitions(...args: any[]);

  /*
     cfindp name view x y index
   */
  cfindp(...args: any[]);

  /*
     for help call chamf without arguments
   */
  chamf(...args: any[]);

  /*
     chamf_throat result shape edge throat
   */
  chamf_throat(...args: any[]);

  /*
     chamf_throat_with_penetration result shape edge face offset throat
   */
  chamf_throat_with_penetration(...args: any[]);

  /*
     chamfer2d result wire (or edge1 edge2) length1 length2
   */
  chamfer2d(...args: any[]);

  /*
     check shape1 shape2 ...
   */
  check(...args: any[]);

  /*
     use checkcurveonsurf shape
   */
  checkcurveonsurf(...args: any[]);

  /*
     checks the validity of the diff between the shapes arg1..argn and result :
 checkdiff arg1 [arg2..argn] result [closedSolid (1/0)] [geomCtrl (1/0)]
   */
  checkdiff(...args: any[]);

  /*
     checkhist
   */
  checkhist(...args: any[]);

  /*
     checkloc shape
   */
  checkloc(...args: any[]);

  /*
     checks the closure of a section : checksection name [-r <RefVal>]
"-r" - allowed number of alone vertices.
   */
  checksection(...args: any[]);

  /*
     checkshape : no args to have help
   */
  checkshape(...args: any[]);

  /*
     chfi2d result face [edge1 edge2 (F radius/CDD d1 d2/CDA d ang) ....]
   */
  chfi2d(...args: any[]);

  /*
     chgrange newname curve2d first last  RequestedFirst RequestedLast ]
   */
  chgrange(...args: any[]);

  /*
     circle name x y [z [dx dy dz]] [ux uy [uz]] radius
   */
  circle(...args: any[]);

  /*
     cirtang cname [-t <Tolerance>] -c <curve> -p <point> -r <Radius>...
   */
  cirtang(...args: any[]);

  /*
     clcurvature curvename
   */
  clcurvature(...args: any[]);

  /*
     clearrepetitions [result]
		Clears all previous repetitions of the periodic shape.
   */
  clearrepetitions(...args: any[]);

  /*
     clintedge shape
   */
  clintedge(...args: any[]);

  /*
     cmakeperiodic result [-x/y/z period [-trim first]]
		Make the connected shape periodic in the required directions.
		result        - resulting periodic shape;
		-x/y/z period - option to make the shape periodic in X, Y or Z
 		                direction with the given period;
		-trim first   - option to trim the shape to fit the required period,
		                starting the period in first.
   */
  cmakeperiodic(...args: any[]);

  /*
     cmaterialson result +/- shape
		Returns the original shapes located on the required side of a shape:
		'+' - on a positive side of a shape (containing the shape with orientation FORWARD)
		'-' - on a negative side of a shape (containing the shape with orientation REVERSED).
   */
  cmaterialson(...args: any[]);

  /*
     cmovep name index dx dy dz
   */
  cmovep(...args: any[]);

  /*
     cmovepoint name u dx dy [dz index1 index2]
   */
  cmovepoint(...args: any[]);

  /*
     cmovetangent name u  x y [z] tx ty [tz constraint = 0]
   */
  cmovetangent(...args: any[]);

  /*
     BsplSurf1 BSplSurf2
   */
  compBsplSur(...args: any[]);

  /*
     Compare shapes. Usage: compare shape1 shape2
   */
  compare(...args: any[]);

  /*
     complement name1 name2 ...
   */
  complement(...args: any[]);

  /*
     compound [name1 name2 ..] compound
   */
  compound(...args: any[]);

  /*
     computetolerance shape
   */
  computetolerance(...args: any[]);

  /*
     concatC0wire result wire
   */
  concatC0wire(...args: any[]);

  /*
     concatwire result wire [option](G1/C1)
   */
  concatwire(...args: any[]);

  /*
     cone name [x y z [dx dy dz [ux uy uz]]] semi-angle radius
   */
  cone(...args: any[]);

  /*
     continuity [tolerance] shape1 shape2 ...
   */
  continuity(...args: any[]);

  /*
     continuityblend C0/C1/C2  [tangle]
   */
  continuityblend(...args: any[]);

  /*
     convert result c2d/c3d/surf [qa,c1,s1,s2,s3,s4,po]
   */
  convert(...args: any[]);

  /*
     convertfrombezier result nbu [nbv] bz1 [bz2 .... bzn] [tol]
   */
  convertfrombezier(...args: any[]);

  /*
     coord P x y [z]: set in x y [z] the coordinates of P
   */
  coord(...args: any[]);

  /*
     copy name1 toname1 name2 toname2 ...
   */
  copy(...args: any[]);

  /*
     countshapes s; count of shape
   */
  countshapes(...args: any[]);

  /*
     cperiodictwins twins shape
		Returns the twins for the shape located on the opposite side of the periodic shape.
   */
  cperiodictwins(...args: any[]);

  /*
     cprj result w s x y z: Conical projection of w (wire or edge) on s (faces).

   */
  cprj(...args: any[]);

  /*
     crepeatshape result -x/y/z times
		Repeats the periodic connected shape in periodic directions required number of times.
		result       - resulting shape;
		-x/y/z times - direction for repetition and number of repetitions.
   */
  crepeatshape(...args: any[]);

  /*
     crvpoints result <curve or wire> deflection
   */
  crvpoints(...args: any[]);

  /*
     crvtpoints result <curve or wire> deflection angular deflection - tangential deflection points
   */
  crvtpoints(...args: any[]);

  /*
     cvalue curvename U  X Y Z [D1X D1Y D1Z D2X D2Y D2Z]
   */
  cvalue(...args: any[]);

  /*
     cylinder name [x y z [dx dy dz [ux uy uz]]]  radius
   */
  cylinder(...args: any[]);

  /*
     deform newname name CoeffX CoeffY CoeffZ
   */
  deform(...args: any[]);

  /*
     deletesweep wire, To delete a section
   */
  deletesweep(...args: any[]);

  /*
      Inclines faces of a shape, dep result shape dirx diry dirz face angle x y x dx dy dz [face angle...]
   */
  depouille(...args: any[]);

  /*
     discrCurve polyline curve params
Approximates a curve by a polyline (first degree B-spline).
nbPnts number - creates polylines with the number points
uniform 0 | 1 - creates polyline with equal length segments
   */
  discrCurve(...args: any[]);

  /*
     dist Shape1 Shape2
   */
  dist(...args: any[]);

  /*
     distmini name Shape1 Shape2 [deflection] [-parallel]
   */
  distmini(...args: any[]);

  /*
      Compute a draft surface along a shape,
 draft result shape dirx diry dirz  angle shape/surf/length [-IN/-OUT] [Ri/Ro] [-Internal]
   */
  draft(...args: any[]);

  /*
     dump name1 name2 ...
   */
  dump(...args: any[]);

  /*
     edge edgename v1 v2
   */
  edge(...args: any[]);

  /*
     edgeintersector r E1 E2 F [Tol]
   */
  edgeintersector(...args: any[]);

  /*
     edgestofaces faces edges [-a AngTol -s Shared(0/1)]
   */
  edgestofaces(...args: any[]);

  /*
     edgestowire wire edges
   */
  edgestowire(...args: any[]);

  /*
     ellipse name x y [z [dx dy dz]] [ux uy [uz]] major minor
   */
  ellipse(...args: any[]);

  /*
     emptycopy [copyshape] originalshape
   */
  emptycopy(...args: any[]);

  /*
     encoderegularity shape [tolerance (in degree)]
   */
  encoderegularity(...args: any[]);

  /*
      Return top and bottom edges of dprism :endedges dprism shapetop shapebottom First/LastShape (1/2)
   */
  endedges(...args: any[]);

  /*
     errorsweep: returns the summary error on resulting surfaces reached by Sweep
   */
  errorsweep(...args: any[]);

  /*
     etrim edge v1 [v2]
   */
  etrim(...args: any[]);

  /*
     evolved , no args to get help
   */
  evolved(...args: any[]);

  /*
     exchuv name ...
   */
  exchuv(...args: any[]);

  /*
     explode name [Cd/C/So/Sh/F/W/E/V]
   */
  explode(...args: any[]);

  /*
     extendcurve name point cont [A(fter)/B(efore)]
   */
  extendcurve(...args: any[]);

  /*
     extendsurf name length cont [U/V] [A(fter)/B(efore)]
   */
  extendsurf(...args: any[]);

  /*
     extsurf name curvename dx dy dz
   */
  extsurf(...args: any[]);

  /*
     exwire wirename
   */
  exwire(...args: any[]);

  /*
     facintedge shape
   */
  facintedge(...args: any[]);

  /*
     fastsewing result [-tol <value>] <list_of_faces>
   */
  fastsewing(...args: any[]);

  /*
     Defines the arguments for a drafted prism : featdprism shape face skface angle Fuse(0/1/2) Modify(0/1)
   */
  featdprism(...args: any[]);

  /*
     Defines the arguments for a linear rib or slot : featlf shape wire plane DirX DirY DirZ DirX DirY DirZ Fuse(0/1/2) Modify(0/1)
   */
  featlf(...args: any[]);

  /*
      Performs the prism revol dprism linform or pipe :featperform prism/revol/pipe/dprism/lf result [[Ffrom] Funtil]
   */
  featperform(...args: any[]);

  /*
      Performs the prism revol dprism or linform with a value :featperformval prism/revol/dprism/lf result value
   */
  featperformval(...args: any[]);

  /*
     Defines the arguments for a pipe : featpipe shape element skface  spine Fuse(0/1/2) Modify(0/1)
   */
  featpipe(...args: any[]);

  /*
     Defines the arguments for a prism : featprism shape element skface  Dirx Diry Dirz Fuse(0/1/2) Modify(0/1)
   */
  featprism(...args: any[]);

  /*
     Defines the arguments for a revol : featrevol shape element skface  Ox Oy Oz Dx Dy Dz Fuse(0/1/2) Modify(0/1)
   */
  featrevol(...args: any[]);

  /*
     Defines the arguments for a rib or slot of revolution : featrf shape wire plane X Y Z DirX DirY DirZ Size Size Fuse(0/1/2) Modify(0/1)
   */
  featrf(...args: any[]);

  /*
     fillcurves result C1 C2 C3 C4 [style 1/2/3]:
	Create a surface filling frame of 4 curves
   */
  fillcurves(...args: any[]);

  /*
      Perform fillet on compounds of edges :fillet result object rad1 comp1 rad2 comp2 ...
   */
  fillet(...args: any[]);

  /*
     fillet2d result wire (or edge1 edge2) radius
   */
  fillet2d(...args: any[]);

  /*
     filling result nbB nbC nbP [SurfInit] [edge][face]order... edge[face]order... point/u v face order...
   */
  filling(...args: any[]);

  /*
     fillingparam : no arg give help
   */
  fillingparam(...args: any[]);

  /*
     findplane name planename
   */
  findplane(...args: any[]);

  /*
      Performs the first hole : firsthole result shape Or.X Or.Y Or.Z Dir.X Dir.Y Dir.Z Radius
   */
  firsthole(...args: any[]);

  /*
     fitcurve result  curve [tol [maxdeg [inverse]]]
   */
  fitcurve(...args: any[]);

  /*
     fmirror name x y z dx dy dz
   */
  fmirror(...args: any[]);

  /*
     fmove name1 name2 ... name, set location from name
   */
  fmove(...args: any[]);

  /*
     Prisms a set of faces of a shape : fprism f[use]/c[ut] result shape [[FaceFrom] FaceUntil] VecX VecY VecZ face1 [face2...]
   */
  fprism(...args: any[]);

  /*
     Rotates a set of faces of a shape : frotate f[use]/c[ut] result shape Angle/[FaceFrom] FaceUntil OX OY OZ DX DY DZ face1 [face2...]
   */
  frotate(...args: any[]);

  /*
     fsameparameter shapename [tol (default 1.e-7)],
force sameparameter on all edges of the shape
   */
  fsameparameter(...args: any[]);

  /*
     fscale name x y z scale
   */
  fscale(...args: any[]);

  /*
     fuseedge shape
   */
  fuseedge(...args: any[]);

  /*
     gbounding surf/curve/curve2d [-o]
   */
  gbounding(...args: any[]);

  /*
     gcarc name seg/cir p1 p2 p3 p4
   */
  gcarc(...args: any[]);

  /*
     gener result wire1 wire2 [..wire..]
   */
  gener(...args: any[]);

  /*
     generated generated_shapes history shape
		Returns the shapes Generated from the given shape in the given history
   */
  generated(...args: any[]);

  /*
     geompipe r spineedge profileedge radius [byACR [byrotate]]
   */
  geompipe(...args: any[]);

  /*
     getcoords vertex1 vertex 2... ; shows coords of input vertices
   */
  getcoords(...args: any[]);

  /*
     getcurvcontinuity {curve or 2dcurve}:
	Returns the continuity of the given curve
   */
  getcurvcontinuity(...args: any[]);

  /*
     getedgeregularity edge face1 [face2]
   */
  getedgeregularity(...args: any[]);

  /*
     getsurfcontinuity surface:
	Returns the continuity of the given surface
   */
  getsurfcontinuity(...args: any[]);

  /*
     glue result shapenew shapebase facenew facebase [facenew facebase...] [edgenew edgebase [edgenew edgebase...]]
   */
  glue(...args: any[]);

  /*
     gplate result nbrcurfront nbrpntconst [SurfInit] [edge 0] [edge tang (1:G1;2:G2) surf]... [point] [u v tang (1:G1;2:G2) surf] ...
   */
  gplate(...args: any[]);

  /*
     gproject projectname curve surface [tolerance [maxdist]]
		[-c continuity][-d maxdegree][-s maxsegments][-2d proj2d][-3d proj3d]
		-c continuity  : set curve continuity (C0, C1, C2) for approximation
		-d maxdegree   : set max possible degree of result for approximation
		-s maxsegments : set max value of parametric intervals the projected curve for approximation
		-2d proj2d     : set necessity of 2d results (0 or 1)
		-3d proj3d     : set necessity of 3d results (0 or 1)
   */
  gproject(...args: any[]);

  /*
     halfspace result face/shell x y z
   */
  halfspace(...args: any[]);

  /*
      Performs a hole : hole result shape Or.X Or.Y Or.Z Dir.X Dir.Y Dir.Z Radius [Pfrom Pto]
   */
  hole(...args: any[]);

  /*
     Sets/Unsets or display controls on holes : holecontrol [0/1]
   */
  holecontrol(...args: any[]);

  /*
      Performs the hole til end : holend result shape Or.X Or.Y Or.Z Dir.X Dir.Y Dir.Z Radius
   */
  holend(...args: any[]);

  /*
     hyperbola name x y [z [dx dy dz]] [ux uy [uz]] major minor
   */
  hyperbola(...args: any[]);

  /*
     incdeg name degree
   */
  incdeg(...args: any[]);

  /*
     incudeg name degree
   */
  incudeg(...args: any[]);

  /*
     incvdeg name degree
   */
  incvdeg(...args: any[]);

  /*
     insertknot name knot [mult = 1] [knot mult ...]
   */
  insertknot(...args: any[]);

  /*
     insertpole name index x y [z] [weight]
   */
  insertpole(...args: any[]);

  /*
     insertuknot name knot mult
   */
  insertuknot(...args: any[]);

  /*
     insertvknot name knot mult
   */
  insertvknot(...args: any[]);

  /*
     interpol cname [fic]
   */
  interpol(...args: any[]);

  /*
     intersect result surf1/curv1 surf2 [tolerance]
		  intersect result surf1 surf2 [u1 v1 u2 v2] [U1F U1L V1F V1L U2F U2L V2F V2L] [tolerance]
   */
  intersect(...args: any[]);

  /*
     invert name, reverse subshapes
   */
  invert(...args: any[]);

  /*
     isbbinterf shape1 shape2 [-o]
Checks whether the bounding-boxes created from the given shapes are interfered. If "-o"-option is switched on then the oriented boxes will be checked. Otherwise, axes-aligned boxes will be checked.
   */
  isbbinterf(...args: any[]);

  /*
     isdeleted history shape
		Checks if the given shape has been deleted in the given history
   */
  isdeleted(...args: any[]);

  /*
     issubshape subshape shape
		Check if the shape is sub-shape of other shape and get its index in the shape.
   */
  issubshape(...args: any[]);

  /*
     law  name degree nbknots  knot, umult  value
   */
  law(...args: any[]);

  /*
     length curve [Tol]
   */
  length(...args: any[]);

  /*
     line name pos dir
   */
  line(...args: any[]);

  /*
     lintan lname curve1 curve2 [angle]
   */
  lintan(...args: any[]);

  /*
     listfuseedge shape
   */
  listfuseedge(...args: any[]);

  /*
     lmirror name [names...] x y z dx dy dz
   */
  lmirror(...args: any[]);

  /*
      Performs a local top. operation : localope result shape tool F/C (fuse/cut) face [face...]
   */
  localope(...args: any[]);

  /*
     localprop curvename U
   */
  localprop(...args: any[]);

  /*
     lprops name [x y z] [-skip] [-full] [-tri]: compute linear properties
   */
  lprops(...args: any[]);

  /*
     create a boss on the shape myS
   */
  makeboss(...args: any[]);

  /*
     makeconnected result shape1 shape2 ...
		Make the given shapes connected (glued).
   */
  makeconnected(...args: any[]);

  /*
     makeperiodic result shape [-x/y/z period [-trim first]]
		Make the shape periodic in the required directions.
		result        - resulting periodic shape;
		-x/y/z period - option to make the shape periodic in X, Y or Z
 		                direction with the given period;
		-trim first   - option to trim the shape to fit the required period,
		                starting the period in first.
   */
  makeperiodic(...args: any[]);

  /*
     maxtolerance shape
   */
  maxtolerance(...args: any[]);

  /*
     middlepath res shape startshape endshape
   */
  middlepath(...args: any[]);

  /*
     minmaxcurandinf curve
   */
  minmaxcurandinf(...args: any[]);

  /*
     mk2dcurve curve edge [face OR index]
   */
  mk2dcurve(...args: any[]);

  /*
     mkcurve curve edge
   */
  mkcurve(...args: any[]);

  /*
     mkedge edge curve [surface] [pfirst plast] [vfirst [pfirst] vlast [plast]]
   */
  mkedge(...args: any[]);

  /*
     mkedgecurve name tolerance
   */
  mkedgecurve(...args: any[]);

  /*
     mkevol result object (then use updatevol) [R/Q/P]
   */
  mkevol(...args: any[]);

  /*
     mkface facename surfacename [ufirst ulast vfirst vlast] [wire [norient]]
   */
  mkface(...args: any[]);

  /*
     mkoffset result face/compound of wires  nboffset stepoffset [jointype(a/i) [alt]]
   */
  mkoffset(...args: any[]);

  /*
     mkoricurve curve edge:
  the curve is colored according to the orientation of the edge
   */
  mkoricurve(...args: any[]);

  /*
     mkplane facename wirename [OnlyPlane 0/1]
   */
  mkplane(...args: any[]);

  /*
     mkpoint point vertex
   */
  mkpoint(...args: any[]);

  /*
     create a shell on Shape
   */
  mksh(...args: any[]);

  /*
     mkshell shellname surfacename [ufirst ulast vfirst vlast] [segment 0/1]
   */
  mkshell(...args: any[]);

  /*
     mksurface surfacename facename
   */
  mksurface(...args: any[]);

  /*
     mksweep wire
   */
  mksweep(...args: any[]);

  /*
     make solids from set of shapes.
mkvolume r b1 b2 ... [-c] [-ni] [-ai]
   */
  mkvolume(...args: any[]);

  /*
     modified modified_shapes history shape
		Returns the shapes Modified from the given shape in the given history
   */
  modified(...args: any[]);

  /*
     movecolp name col dx dy dz
   */
  movecolp(...args: any[]);

  /*
     movelaw name u  x  tx [ constraint = 0]
   */
  movelaw(...args: any[]);

  /*
     movep name row col dx dy dz
   */
  movep(...args: any[]);

  /*
     movepoint name u v dx dy dz [index1u index2u index2v index2v
   */
  movepoint(...args: any[]);

  /*
     moverowp name row dx dy dz
   */
  moverowp(...args: any[]);

  /*
     mypoints result curv deflection
   */
  mypoints(...args: any[]);

  /*

 nbshapes s - shows the number of sub-shapes in <s>;
 nbshapes s -t - shows the number of sub-shapes in <s> counting the same sub-shapes with different location as different sub-shapes.
   */
  nbshapes(...args: any[]);

  /*
      Inclines faces of a shape, dep result shape dirx diry dirz face 0/1 angle x y x dx dy dz [face 0/1 angle...]
   */
  ndepouille(...args: any[]);

  /*
     stable numbered explode for vertex, edge and face: nexplode name [V/E/F]
   */
  nexplode(...args: any[]);

  /*
     nproject pj e1 e2 e3 ... surf -g -d [dmax] [Tol [continuity [maxdeg [maxseg]]]
   */
  nproject(...args: any[]);

  /*
     numshapes s; size of shape
   */
  numshapes(...args: any[]);

  /*
     nurbsconvert result name [result name]
   */
  nurbsconvert(...args: any[]);

  /*
     offset name basename distance [dx dy dz]
   */
  offset(...args: any[]);

  /*
     offsetcompshape r shape offset [face ...]
   */
  offsetcompshape(...args: any[]);

  /*
     offsetload shape offset bouchon1 bouchon2 ...
   */
  offsetload(...args: any[]);

  /*
     offsetonface face1 offset1 face2 offset2 ...
   */
  offsetonface(...args: any[]);

  /*
     offsetparameter Tol Inter(c/p) JoinType(a/i/t) [RemoveInternalEdges(r/k)]
   */
  offsetparameter(...args: any[]);

  /*
     offsetperform result
   */
  offsetperform(...args: any[]);

  /*
     offsetshape r shape offset [tol] [face ...]
   */
  offsetshape(...args: any[]);

  /*
     offsetshapesimple result shape offsetvalue [solid] [tolerance=1e-7]
   */
  offsetshapesimple(...args: any[]);

  /*
     openoffset result face/wire nboffset stepoffset [jointype(a/i)]
   */
  openoffset(...args: any[]);

  /*
     orientation name1 name2.. F/R/E/I
   */
  orientation(...args: any[]);

  /*
     parabola name x y [z [dx dy dz]] [ux uy [uz]] focal
   */
  parabola(...args: any[]);

  /*
     parameters surf/curve X Y [Z] Tol U [V] : {X Y Z} point, {U V} output parameter(s)
   */
  parameters(...args: any[]);

  /*
     tuyau result Path Curve/Radius [Curve2] [Radius]
 the parametrization of the surface in the V direction will be as the Path
   */
  partuyau(...args: any[]);

  /*
     pbsplinecurve name degree nbknots  knot, umult  pole, weight (periodic)
   */
  pbsplinecurve(...args: any[]);

  /*
     pcone name [plane(ax2)] R1 R2 H [angle]
		: Construct a cone, part cone or conical frustum and put result into 'name' variable.
		: Parameters of the cone :
		: - plane  coordinate system for the construction of the cone
		: - R1     cone bottom radius
		: - R2     cone top radius
		: - H      cone height
		: - angle  angle to create a part cone
   */
  pcone(...args: any[]);

  /*
     pcurve [name edgename] facename
   */
  pcurve(...args: any[]);

  /*
     pcylinder name [plane(ax2)] R H [angle]
		: Construct a cylinder and put result into 'name' variable.
		: Parameters of the cylinder :
		: - plane coordinate system for the construction of the cylinder
		: - R     cylinder radius
		: - H     cylinder height
		: - angle cylinder top radius
   */
  pcylinder(...args: any[]);

  /*
     periodictwins twins shape
		Returns the twins for the shape located on the opposite side of the periodic shape.
   */
  periodictwins(...args: any[]);

  /*
     pickface
   */
  pickface(...args: any[]);

  /*
     pipe result Wire_spine Profile [Mode [Approx]], no args to get help
   */
  pipe(...args: any[]);

  /*
     plane name [x y z [dx dy dz [ux uy uz]]]
   */
  plane(...args: any[]);

  /*
     plate result nbrpntoncurve nbrcurfront edge face tang (0:vif;1:tang) ...
   */
  plate(...args: any[]);

  /*
     pmirror name [names...] x y z
   */
  pmirror(...args: any[]);

  /*
     point name x y [z]
   */
  point(...args: any[]);

  /*
     polygon2d name nbnodes x1 y1  ...
   */
  polygon2d(...args: any[]);

  /*
     polygon3d name nbnodes x1 y1 z1  ...
   */
  polygon3d(...args: any[]);

  /*
     Computes area and perimeter of 2D-polygon. Run "polygonprops" w/o any arguments to read help.

   */
  polygonprops(...args: any[]);

  /*
     polyline name x1 y1 z1 x2 y2 z2 ...
   */
  polyline(...args: any[]);

  /*
     polytr name nbnodes nbtri x1 y1 z1 ... n1 n2 n3 ...
   */
  polytr(...args: any[]);

  /*
     polyvertex name v1 v2 ...
   */
  polyvertex(...args: any[]);

  /*
     precision [preci]
   */
  precision(...args: any[]);

  /*
     prism result base dx dy dz [Copy | Inf | Seminf]
   */
  prism(...args: any[]);

  /*
     prj result w s x y z: Cylindrical projection of w (wire or edge) on s (faces) along direction.

   */
  prj(...args: any[]);

  /*
     profile, no args to get help
   */
  profile(...args: any[]);

  /*
     project : no args to have help
   */
  project(...args: any[]);

  /*
     projonplane r C3d Plane [dx dy dz] [0/1]
   */
  projonplane(...args: any[]);

  /*
     projponf face pnt [extrema flag: -min/-max/-minmax] [extrema algo: -g(grad)/-t(tree)]
		Project point on the face.
   */
  projponf(...args: any[]);

  /*
     proximity Shape1 Shape2 [-tol <value>] [-profile]
		: Searches for pairs of overlapping faces of the given shapes.
		: The options are:
		:   -tol     : non-negative tolerance value used for overlapping
		:              test (for zero tolerance, the strict intersection
		:              test will be performed)
		:   -profile : outputs execution time for main algorithm stages
   */
  proximity(...args: any[]);

  /*
     pruled result Edge1/Wire1 Edge2/Wire2
   */
  pruled(...args: any[]);

  /*
     pscale name [names...] x y z s
   */
  pscale(...args: any[]);

  /*
     psphere name [plane(ax2)] R [angle1 angle2] [angle]
		: Construct a sphere, spherical segment or spherical wedge and put result into 'name' variable.
		: Parameters of the sphere :
		: - plane  coordinate system for the construction of the sphere
		: - R      sphere radius
		: - angle1 first angle to create a spherical segment  [-90; 90]
		: - angle2 second angle to create a spherical segment [-90; 90]
		: - angle  angle to create a spherical wedge
   */
  psphere(...args: any[]);

  /*
     ptorus name [plane(ax2)] R1 R2 [angle1 angle2] [angle]
		: Construct a torus or torus segment and put result into 'name' variable.
		: Parameters of the torus :
		: - plane  coordinate system for the construction of the torus
		: - R1     distance from the center of the pipe to the center of the torus
		: - R2     radius of the pipe
		: - angle1 first angle to create a torus ring segment
		: - angle2 second angle to create a torus ring segment
		: - angle  angle to create a torus pipe segment
   */
  ptorus(...args: any[]);

  /*
     purgeloc res shape
   */
  purgeloc(...args: any[]);

  /*
     returns the free memory from the system to the memory manager
   */
  purgemmgt(...args: any[]);

  /*
     quilt compoundname shape1 edgeshape2  edgeshape1... shape2  edgeshape3 edgeshape1or2 ... shape3 ...
   */
  quilt(...args: any[]);

  /*
     radiusmax curvename  radius
   */
  radiusmax(...args: any[]);

  /*
     radiusratio curvename ratio
   */
  radiusratio(...args: any[]);

  /*
     range edge [face] first last
   */
  range(...args: any[]);

  /*
     rawcont curve1 curve2 u1 u2
   */
  rawcont(...args: any[]);

  /*
     readbrep filename shape
		: Restore the shape from the binary or ASCII format file.
   */
  readbrep(...args: any[]);

  /*
     reducepcurves shape1 shape2 ...
   */
  reducepcurves(...args: any[]);

  /*
     remcolpole name index
   */
  remcolpole(...args: any[]);

  /*
     remknot name index [mult] [tol]
   */
  remknot(...args: any[]);

  /*
     removefeatures result shape f1 f2 ... [-parallel]
		Removes user-defined features (faces) from the shape.
		result   - result of the operation;
		shape    - the shape to remove the features from;
		f1, f2   - features to remove from the shape;
		parallel - enables the parallel processing mode.
   */
  removefeatures(...args: any[]);

  /*
     removeinternals shape [force flag {0/1}]
		             Removes sub-shapes with internal orientation from the shape.

		             Force flag disables the check on topological connectivity andremoves all internal sub-shapes

   */
  removeinternals(...args: any[]);

  /*
     rempole name index
   */
  rempole(...args: any[]);

  /*
     remrowpole name index
   */
  remrowpole(...args: any[]);

  /*
     remuknot name index [mult] [tol]
   */
  remuknot(...args: any[]);

  /*
     remvknot name index [mult] [tol]
   */
  remvknot(...args: any[]);

  /*
     repeatshape result -x/y/z times
		Repeats the periodic shape in periodic directions required number of times.
		result       - resulting shape;
		-x/y/z times - direction for repetition and number of repetitions.
   */
  repeatshape(...args: any[]);

  /*
     reperage shape -> list of shape (result of interstion shape , line)
   */
  reperageshape(...args: any[]);

  /*
     reset name1 name2 ..., remove location
   */
  reset(...args: any[]);

  /*
     reverse name ...
   */
  reverse(...args: any[]);

  /*
     revol result base px py pz dx dy dz angle [Copy]
   */
  revol(...args: any[]);

  /*
     revsurf name curvename x y z dx dy dz
   */
  revsurf(...args: any[]);

  /*
     rollingball  r S radius [stopf1 ..] @ [f1 f2 ..] @ [e1 ..]
   */
  rollingball(...args: any[]);

  /*
     rotate name [names...] x y z dx dy dz angle
   */
  rotate(...args: any[]);

  /*
     ruled result C1 C2
   */
  ruled(...args: any[]);

  /*
     sameparameter [result] shape [tol]
   */
  sameparameter(...args: any[]);

  /*
     savehistory name
		Saves the history from the session into a drawable object with the name <name>.
   */
  savehistory(...args: any[]);

  /*
     scalexyz res shape factor_x factor_y factor_z
   */
  scalexyz(...args: any[]);

  /*
     segment name Ufirst Ulast [tol]
   */
  segment(...args: any[]);

  /*
     segsur name Ufirst Ulast Vfirst Vlast [Utol [Vtol]]
   */
  segsur(...args: any[]);

  /*
     selfintersect Shape [-tol <value>] [-profile]
		: Searches for intersected/overlapped faces in the given shape.
		: The algorithm uses shape tessellation (should be computed in
		: advance), and provides approximate results. The options are:
		:   -tol     : non-negative tolerance value used for overlapping
		:              test (for zero tolerance, the strict intersection
		:              test will be performed)
		:   -profile : outputs execution time for main algorithm stages
   */
  selfintersect(...args: any[]);

  /*
     Controls the history collection by the algorithms and its saving into the session after algorithm is done.
		Usage: setfillhistory [flag]
		w/o arguments prints the current state of the option;
		flag == 0 - history will not be collected and saved;
		flag != 0 - history will be collected and saved into the session (default).
   */
  setfillhistory(...args: any[]);

  /*
     setflags shape_name flag1[flag2...]
 sets flags for shape(free, modified, checked, orientable, closed, infinite, convex, locked), for example <setflags a free> or <setflags a -free> if necessary unflag
   */
  setflags(...args: any[]);

  /*
     setknot name index knot [mult]
   */
  setknot(...args: any[]);

  /*
     setnotperiodic name
   */
  setnotperiodic(...args: any[]);

  /*
     setorigin name knotindex
   */
  setorigin(...args: any[]);

  /*
     setperiodic name ...
   */
  setperiodic(...args: any[]);

  /*
     setsweep  no args to get help
   */
  setsweep(...args: any[]);

  /*
     setunotperiodic name ...
   */
  setunotperiodic(...args: any[]);

  /*
     setuorigin name knotindex
   */
  setuorigin(...args: any[]);

  /*
     setuperiodic name ...
   */
  setuperiodic(...args: any[]);

  /*
     setvnotperiodic name ...
   */
  setvnotperiodic(...args: any[]);

  /*
     setvorigin name knotindex
   */
  setvorigin(...args: any[]);

  /*
     setvperiodic name ...
   */
  setvperiodic(...args: any[]);

  /*
     setweight curve/surf index1 [index2] weight
		changes a weight of a pole of B-spline curve/surface (index2 is useful for surfaces only)
   */
  setweight(...args: any[]);

  /*
     sewing result [tolerance] shape1 shape2 ... [min tolerance] [max tolerance] [switches]
   */
  sewing(...args: any[]);

  /*
     sfindp name view x y Uindex Vindex
   */
  sfindp(...args: any[]);

  /*
     shape name V/E/W/F/Sh/So/CS/C; make a empty shape
   */
  shape(...args: any[]);

  /*
     shapeG0continuity  shape  edge nbeval [epsnul [epsG0]]
   */
  shapeG0continuity(...args: any[]);

  /*
     shapeG1continuity  shape  edge nbeval [epsnul [epsG0 [epsG1]]]
   */
  shapeG1continuity(...args: any[]);

  /*
     shapeG2continuity shape  edge  nbeval [epsnul [epsG0 [epsG1 [maxlen [perce]]]]]
   */
  shapeG2continuity(...args: any[]);

  /*
     shcurvature curvename
   */
  shcurvature(...args: any[]);

  /*
     shnodes name
   */
  shnodes(...args: any[]);

  /*
     shtriangles name
   */
  shtriangles(...args: any[]);

  /*
     simulsweep r [n] [option]
   */
  simulsweep(...args: any[]);

  /*
     smirror name [names...] x y z dx dy dz
   */
  smirror(...args: any[]);

  /*
     orientsolid myClosedSolid
   */
  solidorientation(...args: any[]);

  /*
     sphere name [x y z [dx dy dz [ux uy uz]]]  radius
   */
  sphere(...args: any[]);

  /*
     splitc1 bspline resultinarray(0/1) [tol] [angtol]
   */
  splitc1(...args: any[]);

  /*
     splitc12d bspline2d resultinarray(0/1) [tol] [angtol]
   */
  splitc12d(...args: any[]);

  /*
     splitshape result shape [splitedges] [face wire/edge/compound [wire/edge/compound ...][face wire/edge/compound [wire/edge/compound...] ...] [@ edgeonshape edgeonwire [edgeonshape edgeonwire...]]
   */
  splitshape(...args: any[]);

  /*
     sprops name [epsilon] [x y z] [-skip] [-full] [-tri]:
  compute surfacic properties
   */
  sprops(...args: any[]);

  /*
     subshape name V/E/W/F/Sh/So/CS/C index; get subsshape <index> of given type
   */
  subshape(...args: any[]);

  /*
     surface_radius surface Uvalue <Real> Vvalue <Real> returns min max radius of curvature
   */
  surface_radius(...args: any[]);

  /*
     surfoints result surf deflection
   */
  surfpoints(...args: any[]);

  /*
     svalue surfname U V X Y Z [DUX DUY DUZ DVX DVY DVZ [D2UX D2UY D2UZ D2VX D2VY D2VZ D2UVX D2UVY D2UVZ]]
   */
  svalue(...args: any[]);

  /*
     sweep result [options] path [Surf] curve [Tol [nbsegment]]
 sweep the curve along the path, options are
 -FX : Tangent and Normal are fixed
 -FR : Tangent and Normal are given by Frenet trihedron
 -CF : Tangente is given by Frenet,
     the Normal is computed to minimize the torsion
 -DX : Tangent and Normal are given by Darboux trihedron
     <path> have to be a 2d curve,
     <Surf> have to be defined
 -CN dx dy dz : Normal is given by dx dy dz
   */
  sweep(...args: any[]);

  /*
     tanginterpol curve [p] num_points points [tangents] modifier  p = periodic
   */
  tanginterpol(...args: any[]);

  /*
     tcopy [-n(ogeom)] [-m(esh)] name1 result1 [name2 result2 ...]
   */
  tcopy(...args: any[]);

  /*
     thickshell r shape offset [jointype [tol] ]
   */
  thickshell(...args: any[]);

  /*
     thrusections [-N] result issolid isruled shape1 shape2 [..shape..], the option -N means no check on wires, shapes must be wires or vertices (only first or last)
   */
  thrusections(...args: any[]);

  /*
     tmirror name x y z dx dy dz [-copy]
   */
  tmirror(...args: any[]);

  /*
     tmove name1 name2 ... name, set location from name [-copy]
   */
  tmove(...args: any[]);

  /*
     to2d c2dname c3d [plane (XOY)]
   */
  to2d(...args: any[]);

  /*
     to3d c3dname c2d [plane (XOY)]
   */
  to3d(...args: any[]);

  /*
     tobezier result c2d/c3d/surf [ufirst, ulast / ufirst, ulast, vfirst, vlast]
   */
  tobezier(...args: any[]);

  /*
     tolblend [ta t3d t2d fl]
   */
  tolblend(...args: any[]);

  /*
     toolsphere shape
		shows vertex tolerances by drawing spheres
   */
  tolsphere(...args: any[]);

  /*
     torus name [x y z [dx dy dz [ux uy uz]]]  major minor
   */
  torus(...args: any[]);

  /*
     transfert edge1 edge2
   */
  transfert(...args: any[]);

  /*
     translate name [names...] dx dy dz
   */
  translate(...args: any[]);

  /*
     treverse name1 name2 ...
   */
  treverse(...args: any[]);

  /*
     trim newname name [u1 u2 [v1 v2] [usense=1 vsense=1]]
		: Creates either a new trimmed curve from a curve
		: or a new trimmed surface in u and v from a surface.
		: Removes trim when called without arguments.
		: - u1 u2   lower and upper parameters of trimming on U direction
		: - v1 v2   lower and upper parameters of trimming on V direction
		: - usense vsense   senses on U and V directions: 1 - true, 0 - false;
		    Senses are used for the construction only if the surface is periodic
		    in the corresponding parametric direction, and define the available part of the surface
   */
  trim(...args: any[]);

  /*
     trimu newname name u1 u2 [usense=1]
		: Creates a u-trimmed surface.
		: - u1 u2  lower and upper parameters of trimming on U direction
		: - usense sense on U direction: 1 - true, 0 - false;
		    usense is used for the construction only if the surface is u-periodic
		    in the u parametric direction, and define the available part of the surface
   */
  trimu(...args: any[]);

  /*
     trimv newname name v1 v2 [vsense=1]
		: Creates a v-trimmed surface.
		: - u1 u2  lower and upper parameters of trimming on V direction
		: - vsense sense on V direction: 1 - true, 0 - false;
		    vsense is used for the construction only if the surface is v-periodic
		    in the v parametric direction, and define the available part of the surface
   */
  trimv(...args: any[]);

  /*
     trollingball r S radius [stopf1 ..] @ [f1 f2 ..] @ [e1 ..]
   */
  trollingball(...args: any[]);

  /*
     trotate name1 name2 ... x y z dx dy dz angle [-copy]
   */
  trotate(...args: any[]);

  /*
     tscale name x y z scale [-copy]
   */
  tscale(...args: any[]);

  /*
     ttranslate name1 name2 ... dx dy dz [-copy]
   */
  ttranslate(...args: any[]);

  /*
     tuyau [-NS] result Path Curve/Radius [Curve2] [Curve3] ... [Radius]
 the option -NS is used only with 2 sections.
 With it, <result> is going from the first section to the last section
 Without, <result> is a pipe by evolutive section
   */
  tuyau(...args: any[]);

  /*
     uiso curvename surfacename u
   */
  uiso(...args: any[]);

  /*
     uisoedge edge face u v1 v2
   */
  uisoedge(...args: any[]);

  /*
     uniformAbscissa Curve nbPnt
   */
  uniformAbscissa(...args: any[]);

  /*
     uniformAbscissaEl maxR minR nbPnt
   */
  uniformAbscissaEl(...args: any[]);

  /*
     bsplinesurf name udegree nbuknots  uknot, umult  vdegree nbvknots vknot, vmult pole, weight
   */
  upbsplinesurf(...args: any[]);

  /*
     updatetolerance [result] shape [param]
  if [param] is absent - not verify of face tolerance, else - perform it
   */
  updatetolerance(...args: any[]);

  /*
     updatevol edge u1 rad1 u2 rad2 ...
   */
  updatevol(...args: any[]);

  /*
     ureverse name ...
   */
  ureverse(...args: any[]);

  /*
     bsplinesurf name udegree nbuknots  uknot, umult  vdegree nbvknots vknot, vmult pole, weight
   */
  uvpbsplinesurf(...args: any[]);

  /*
     validrange edge [(out) u1 u2]
		computes valid range of the edge, and
		prints first and last values or sets the variables u1 and u2
   */
  validrange(...args: any[]);

  /*
     vecdc + Pointe double click
   */
  vecdc(...args: any[]);

  /*
     vertex name [x y z | p edge | poin]
   */
  vertex(...args: any[]);

  /*
     viso curvename surfacename v
   */
  viso(...args: any[]);

  /*
     visoedge edge face v u1 u2
   */
  visoedge(...args: any[]);

  /*
     bsplinesurf name udegree nbuknots  uknot, umult  vdegree nbvknots vknot, vmult pole, weight
   */
  vpbsplinesurf(...args: any[]);

  /*
     vprops name [epsilon] [c[losed]] [x y z] [-skip] [-full] [-tri]:
  compute volumic properties
   */
  vprops(...args: any[]);

  /*
     vpropsgk name epsilon closed span mode [x y z] [-skip] : compute volumic properties
   */
  vpropsgk(...args: any[]);

  /*
     vreverse name ...
   */
  vreverse(...args: any[]);

  /*
     wedge name [Ox Oy Oz Zx Zy Zz Xx Xy Xz] dx dy dz ltx / xmin zmin xmax zmax
   */
  wedge(...args: any[]);

  /*
     wexplo wire [face] create WEDGE_i
   */
  wexplo(...args: any[]);

  /*
     wire wirename [-unsorted] e1/w1 [e2/w2 ...]
   */
  wire(...args: any[]);

  /*
     Prisms wires on a face : wprism f[use]/c[ut] result shape [[FaceFrom] FaceUntil] VecX VecY VecZ  SkecthFace wire1 [wire2 ....]
   */
  wprism(...args: any[]);

  /*
     writebrep shape filename [-binary {0|1}]=0 [-version Version]=4
		:                          [-triangles {0|1}]=1 [-normals {0|1}]=0
		: Save the shape in the ASCII (default) or binary format file.
		:  -binary  write into the binary format (ASCII when unspecified)
		:  -version a number of format version to save;
		:           ASCII  versions: 1, 2 and 3    (3 for ASCII  when unspecified);
		:           Binary versions: 1, 2, 3 and 4 (4 for Binary when unspecified).
		:  -triangles write triangulation data (TRUE when unspecified).
		:           Ignored (always written) if face defines only triangulation (no surface).
		:  -normals include vertex normals while writing triangulation data (FALSE when unspecified).
   */
  writebrep(...args: any[]);

  /*
     Rotates wires on a face : wrotate f[use]/c[ut] result shape Angle/[FFrom] FUntil OX OY OZ DX DY DZ SkecthFace wire1 [wire2 ....]
   */
  wrotate(...args: any[]);

  /*
     xbounds face
   */
  xbounds(...args: any[]);

  /*
     use xclassify Solid [Tolerance=1.e-7]
   */
  xclassify(...args: any[]);

  /*
     use xdistef edge face
   */
  xdistef(...args: any[]);
}
