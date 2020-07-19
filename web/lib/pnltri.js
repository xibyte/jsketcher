// pnltri.js / raw.github.com/jahting/pnltri.js/master/LICENSE
/**
 * @author jahting / http://www.ameco.tv/
 *
 *	(Simple) Polygon Near-Linear Triangulation
 *	  with fast ear-clipping for polygons without holes
 *
 */

var PNLTRI = { REVISION: '2.1.1' };

//	#####  Global Constants  #####


//	#####  Global Variables  #####


/**
 * @author jahting / http://www.ameco.tv/
 */

PNLTRI.Math = {

	random: Math.random,		// function to use for random number generation

	// generate random ordering in place:
	//	Fisher-Yates shuffle
	array_shuffle: function( inoutArray ) {
		for (var i = inoutArray.length - 1; i > 0; i-- ) {
			var j = Math.floor( PNLTRI.Math.random() * (i+1) );
			var tmp = inoutArray[i];
			inoutArray[i] = inoutArray[j];
			inoutArray[j] = tmp;
		}
		return	inoutArray;
	},


	//	like compare (<=>)
	//		yA > yB resp. xA > xB: 1, equal: 0, otherwise: -1
	compare_pts_yx: function ( inPtA, inPtB ) {
		var deltaY = inPtA.y - inPtB.y;
		if ( deltaY < PNLTRI.Math.EPSILON_N ) {
			return -1;
		} else if ( deltaY > PNLTRI.Math.EPSILON_P ) {
			return 1;
		} else {
			var deltaX = inPtA.x - inPtB.x;
			if ( deltaX < PNLTRI.Math.EPSILON_N ) {
				return -1;
			} else if ( deltaX > PNLTRI.Math.EPSILON_P ) {
				return  1;
			} else {
				return  0;
			}
		}
	},


	ptsCrossProd: function ( inPtVertex, inPtFrom, inPtTo ) {
		// two vectors: ( v0: inPtVertex -> inPtFrom ), ( v1: inPtVertex -> inPtTo )
		// CROSS_SINE: sin(theta) * len(v0) * len(v1)
		return	( inPtFrom.x - inPtVertex.x ) * ( inPtTo.y - inPtVertex.y ) -
				( inPtFrom.y - inPtVertex.y ) * ( inPtTo.x - inPtVertex.x );
		// <=> crossProd( inPtFrom-inPtVertex, inPtTo-inPtVertex )
		// == 0: colinear (angle == 0 or 180 deg == PI rad)
		// > 0:  v1 lies left of v0, CCW angle from v0 to v1 is convex ( < 180 deg )
		// < 0:  v1 lies right of v0, CW angle from v0 to v1 is convex ( < 180 deg )
	},

};

// precision of floating point arithmetic
//	PNLTRI.Math.EPSILON_P = Math.pow(2,-32);	// ~ 0.0000000001
	PNLTRI.Math.EPSILON_P = Math.pow(2,-43);	// ~ 0.0000000000001
	PNLTRI.Math.EPSILON_N = -PNLTRI.Math.EPSILON_P;

//	Problem with EPSILON-compares:
//	- especially when there is a x-coordinate ordering on equal y-coordinates
//		=> either NO EPSILON-compares on y-coordinates, since almost equal y
//			can have very different x - so they are not nearly close
//		or EPSILON must be bigger: Solution so far.
/**
 * @author jahting / http://www.ameco.tv/
 */

/** @constructor */
PNLTRI.PolygonData = function ( inPolygonChainList ) {

	// list of polygon vertices
	//	.x, .y: coordinates
	this.vertices = [];

	// list of polygon segments, original polygons ane holes
	//	and additional ones added during the subdivision into
	//	uni-y-monotone polygons (s. this.monoSubPolyChains)
	//	doubly linked by: snext, sprev
	this.segments = [];
	this.diagonals = [];

	// for the ORIGINAL polygon chains
	this.idNextPolyChain = 0;
	//	for each original chain: lies the polygon inside to the left?
	//	"true": winding order is CCW for a contour or CW for a hole
	//	"false": winding order is CW for a contour or CCW for a hole
	this.PolyLeftArr = [];

	// indices into this.segments: at least one for each monoton chain for the polygon
	//  these subdivide the polygon into uni-y-monotone polygons, that is
	//  polygons that have only one segment between ymax and ymin on one side
	//  and the other side has monotone increasing y from ymin to ymax
	// the monoSubPolyChains are doubly linked by: mnext, mprev
	this.monoSubPolyChains = [];

	// list of triangles: each 3 indices into this.vertices
	this.triangles = [];

	// initialize optional polygon chains
	if ( inPolygonChainList ) {
		for (var i=0, j=inPolygonChainList.length; i<j; i++) {
			this.addPolygonChain( inPolygonChainList[i] );
		}
	}

};


PNLTRI.PolygonData.prototype = {

	constructor: PNLTRI.PolygonData,


	/*	Accessors  */

	nbVertices: function () {
		return	this.vertices.length;
	},
	getSegments: function () {
		return	this.segments;
	},
	getFirstSegment: function () {
		return	this.segments[0];
	},
	getMonoSubPolys: function () {
		return	this.monoSubPolyChains;
	},
	getTriangles: function () {
		return	this.triangles.concat();
	},

	nbPolyChains: function () {
		return	this.idNextPolyChain;
	},

	// for the polygon data AFTER triangulation
	//	returns an Array of flags, one flag for each polygon chain:
	//		lies the inside of the polygon to the left?
	//		"true" implies CCW for contours and CW for holes
	get_PolyLeftArr: function () {
		return	this.PolyLeftArr.concat();
	},
	set_PolyLeft_wrong: function ( inChainId ) {
		this.PolyLeftArr[inChainId] = false;
	},


	/*	Helper  */

	// checks winding order by calculating the area of the polygon
	isClockWise: function ( inStartSeg ) {
		var cursor = inStartSeg, doubleArea = 0;
		do {
			doubleArea += ( cursor.vFrom.x - cursor.vTo.x ) * ( cursor.vFrom.y + cursor.vTo.y );
			cursor = cursor.snext;
		} while ( cursor != inStartSeg );
		return	( doubleArea < 0 );
	},


	/*	Operations  */

	appendVertexEntry: function ( inVertexX, inVertexY ) {			// private
		var vertex = {
				id: this.vertices.length,	// vertex id, representing input sequence
				x: inVertexX,				// coordinates
				y: inVertexY,
			};
		this.vertices.push( vertex );
		return	vertex;
	},


	createSegmentEntry: function ( inVertexFrom, inVertexTo ) {			// private
		return	{
			chainId: this.idNextPolyChain,
			// end points of segment
			vFrom: inVertexFrom,	// -> start point entry in vertices
			vTo: inVertexTo,		// -> end point entry in vertices
			// upward segment? (i.e. vTo > vFrom) !!! only valid for sprev,snext NOT for mprev,mnext !!!
			upward: ( PNLTRI.Math.compare_pts_yx(inVertexTo, inVertexFrom) == 1 ),
			// doubly linked list of original polygon chains (not the monoChains !)
			sprev: null,			// previous segment
			snext: null,			// next segment
			//
			//	for performance reasons:
			//	 initialization of all fields added later
			//
			// for trapezoids
			rootFrom: null,			// root of partial tree where vFrom is located
			rootTo: null,			// root of partial tree where vTo is located
			is_inserted: false,		// already inserted into QueryStructure ?
			// for assigning depth: trapezoids
			trLeft: null,			// one trapezoid bordering on the left of this segment
			trRight: null,			// one trapezoid bordering on the right of this segment
			// for monochains
			mprev: null,			// doubly linked list for monotone chains (sub-polygons)
			mnext: null,
			marked: false,			// already visited during unique monoChain identification ?
		};
	},

	appendSegmentEntry: function ( inSegment ) {				// private
		this.segments.push( inSegment );
		return	inSegment;
	},


	appendDiagonalsEntry: function ( inDiagonal ) {				// <<<<<	public
		this.diagonals.push( inDiagonal );
		return	inDiagonal;
	},


	addVertexChain: function ( inRawPointList ) {			// private

		function verts_equal( inVert1, inVert2 ) {
			return ( ( Math.abs(inVert1.x - inVert2.x) < PNLTRI.Math.EPSILON_P ) &&
					 ( Math.abs(inVert1.y - inVert2.y) < PNLTRI.Math.EPSILON_P ) );
		}

		function verts_colinear_chain( inVert1, inVert2, inVert3 ) {
			if ( Math.abs( PNLTRI.Math.ptsCrossProd( inVert2, inVert1, inVert3 ) ) > PNLTRI.Math.EPSILON_P )	return false;
			// only real sequences, not direction reversals
			var low, middle, high;
			if ( Math.abs( inVert1.y - inVert2.y ) < PNLTRI.Math.EPSILON_P ) {
				// horizontal line
				middle = inVert2.x;
				if ( inVert1.x < inVert3.x ) {
					low = inVert1.x;
					high = inVert3.x;
				} else {
					low = inVert3.x;
					high = inVert1.x;
				}
			} else {
				middle = inVert2.y;
				if ( inVert1.y < inVert3.y ) {
					low = inVert1.y;
					high = inVert3.y;
				} else {
					low = inVert3.y;
					high = inVert1.y;
				}
			}
			return	( ( ( low - middle ) < PNLTRI.Math.EPSILON_P ) && ( ( middle - high ) < PNLTRI.Math.EPSILON_P ) );
		}

		var newVertices = [];
		var newVertex, acceptVertex, lastIdx;
		for ( var i=0; i < inRawPointList.length; i++ ) {
			newVertex = this.appendVertexEntry( inRawPointList[i].x, inRawPointList[i].y );
			// suppresses zero-length segments
			acceptVertex = true;
			lastIdx = newVertices.length-1;
			if ( lastIdx >= 0 ) {
				if ( verts_equal( newVertex, newVertices[lastIdx] ) ) {
					acceptVertex = false;
				} else if ( lastIdx > 0 ) {
					if ( verts_colinear_chain( newVertices[lastIdx-1], newVertices[lastIdx], newVertex ) ) {
						newVertices.pop();
					}
				}
			}
			if ( acceptVertex )	newVertices.push( newVertex );
		}
		// compare last vertices to first: suppresses zero-length and co-linear segments
		lastIdx = newVertices.length - 1;
		if ( ( lastIdx > 0 ) &&
			 verts_equal( newVertices[lastIdx], newVertices[0] ) ) {
			newVertices.pop();
			lastIdx--;
		}
		if ( lastIdx > 1 ) {
			if ( verts_colinear_chain( newVertices[lastIdx-1], newVertices[lastIdx], newVertices[0] ) ) {
				newVertices.pop();
				lastIdx--;
			}
			if ( ( lastIdx > 1 ) &&
				 verts_colinear_chain( newVertices[lastIdx], newVertices[0], newVertices[1] ) ) {
				newVertices.shift();
			}
		}

		return	newVertices;
	},


	addPolygonChain: function ( inRawPointList ) {			// <<<<<< public

		// vertices
		var newVertices = this.addVertexChain( inRawPointList );
		if ( newVertices.length < 3 ) {
			console.log( "Polygon has < 3 vertices!", newVertices );
			return	0;
		}

		// segments
		var	saveSegListLength = this.segments.length;
		//
		var	segment, firstSeg, prevSeg;
		for ( var i=0; i < newVertices.length-1; i++ ) {
			segment = this.createSegmentEntry( newVertices[i], newVertices[i+1] );
			if (prevSeg) {
				segment.sprev = prevSeg;
				prevSeg.snext = segment;
			} else {
				firstSeg = segment;
			}
			prevSeg = segment;
			this.appendSegmentEntry( segment );
		}
		// close polygon
		segment = this.createSegmentEntry( newVertices[newVertices.length-1], newVertices[0] );
		segment.sprev = prevSeg;
		prevSeg.snext = segment;
		this.appendSegmentEntry( segment );
		firstSeg.sprev = segment;
		segment.snext = firstSeg;

		this.PolyLeftArr[this.idNextPolyChain++] = true;
		return	this.segments.length - saveSegListLength;
	},


	/* Monotone Polygon Chains */

	// Generate the uni-y-monotone sub-polygons from
	//	the trapezoidation of the polygon.

	create_mono_chains: function () {						// <<<<<< public
		var newMono, newMonoTo, toFirstOutSeg, fromRevSeg;
		for ( var i = 0, j = this.segments.length; i < j; i++) {
			newMono = this.segments[i];
			if ( this.PolyLeftArr[newMono.chainId] ) {
				// preserve winding order
				newMonoTo = newMono.vTo;			// target of segment
				newMono.mprev = newMono.sprev;		// doubly linked list for monotone chains (sub-polygons)
				newMono.mnext = newMono.snext;
			} else {
				// reverse winding order
				newMonoTo = newMono.vFrom;
				newMono = newMono.snext;
				newMono.mprev = newMono.snext;
				newMono.mnext = newMono.sprev;
			}
			if ( fromRevSeg = newMono.vFrom.lastInDiag ) {		// assignment !
				fromRevSeg.mnext = newMono;
				newMono.mprev = fromRevSeg;
				newMono.vFrom.lastInDiag = null;		// cleanup
			}
			if ( toFirstOutSeg = newMonoTo.firstOutDiag ) {		// assignment !
				toFirstOutSeg.mprev = newMono;
				newMono.mnext = toFirstOutSeg;
				newMonoTo.firstOutDiag = null;			// cleanup
			}
		}
	},

	// For each monotone polygon, find the ymax (to determine the two
	// y-monotone chains) and skip duplicate monotone polygons

	unique_monotone_chains_max: function () {			// <<<<<< public

		function find_monotone_chain_max( frontMono ) {
			var frontPt, firstPt, ymaxPt;

			var monoPosmax = frontMono;
			firstPt = ymaxPt = frontMono.vFrom;

			frontMono.marked = true;
			frontMono = frontMono.mnext;
			while ( frontPt = frontMono.vFrom ) {				// assignment !
				if (frontMono.marked) {
					if ( frontPt == firstPt )	break;	// mono chain completed
					console.log("ERR unique_monotone: segment in two chains", firstPt, frontMono );
					return	null;
				} else {
/*					if ( frontPt == firstPt ) {			// check for robustness
						console.log("ERR unique_monotone: point double", firstPt, frontMono );
					}		*/
					frontMono.marked = true;
				}
				if ( PNLTRI.Math.compare_pts_yx( frontPt, ymaxPt ) == 1 ) {
					ymaxPt = frontPt;
					monoPosmax = frontMono;
				}
				frontMono = frontMono.mnext;
			}
			return	monoPosmax;
		}

		var frontMono, monoPosmax;

		// assumes attribute "marked" is NOT yet "true" for any mono chain segment
		this.monoSubPolyChains = [];
		// loop through all original segments
		for ( var i = 0, j = this.segments.length; i < j; i++ ) {
			frontMono = this.segments[i];
			if ( frontMono.marked )		continue;		// already in a processed mono chain
			monoPosmax = find_monotone_chain_max( frontMono );
			if ( monoPosmax )	this.monoSubPolyChains.push( monoPosmax );
		}
		// loop through all additional segments (diagonals)			// TODO: Testcase for mono chain without original segments !!!
/*		for ( var i = 0, j = this.diagonals.length; i < j; i++ ) {
			frontMono = this.diagonals[i];
			if ( frontMono.marked )		continue;		// already in a processed mono chain
			monoPosmax = find_monotone_chain_max( frontMono );
			if ( monoPosmax )	this.monoSubPolyChains.push( monoPosmax );
		}	*/
		return	this.monoSubPolyChains;
	},


	/* Triangles */

	clearTriangles: function () {
		this.triangles = [];
	},

	addTriangle: function ( inVert1, inVert2, inVert3 ) {
		this.triangles.push( [ inVert1.id, inVert2.id, inVert3.id ] );
	},

};

/**
 * Simple Polygon Triangulation by Ear Clipping
 *
 * description of technique employed:
 *	http://www.siggraph.org/education/materials/HyperGraph/scanline/outprims/polygon1.htm
 *
 * This code is a quick port of code written in C++ which was submitted to
 *	flipcode.com by John W. Ratcliff  // July 22, 2000
 * See original code and more information here:
 *	http://www.flipcode.com/archives/Efficient_Polygon_Triangulation.shtml
 *
 * ported to actionscript by Zevan Rosser
 *	http://actionsnippet.com/?p=1462
 *
 * ported to javascript by Joshua Koo
 *	http://www.lab4games.net/zz85/blog
 *
 * adapted to doubly linked list by Juergen Ahting
 *	http://www.ameco.tv
 *
 */

/** @constructor */
PNLTRI.EarClipTriangulator = function ( inPolygonData ) {

	this.polyData	= inPolygonData;

};


PNLTRI.EarClipTriangulator.prototype = {

	constructor: PNLTRI.EarClipTriangulator,


	// triangulates first doubly linked segment list in this.polyData
	//	algorithm uses ear-clipping and runs in O(n^2) time

	triangulate_polygon_no_holes: function () {

		function isEarAt( vertex ) {

			var prevX = vertex.mprev.vFrom.x;
			var prevY = vertex.mprev.vFrom.y;

			var vertX = vertex.vFrom.x;
			var vertY = vertex.vFrom.y;

			var nextX = vertex.mnext.vFrom.x;
			var nextY = vertex.mnext.vFrom.y;

			var vnX = nextX - vertX,  vnY = nextY - vertY;
			var npX = prevX - nextX,  npY = prevY - nextY;
			var pvX = vertX - prevX,  pvY = vertY - prevY;

			// concave angle at vertex -> not an ear to cut off
			if ( PNLTRI.Math.EPSILON_P > ( ( pvX * vnY ) - ( vnX * pvY ) ) ) return false;

			// check whether any other point lieas within the triangle abc
			var vStop	= vertex.mprev.mprev;
			var vOther	= vertex.mnext;
			while ( vOther != vStop ) {
				vOther = vOther.mnext;
				var otherX = vOther.vFrom.x;
				var otherY = vOther.vFrom.y;

				var poX = otherX - prevX,  poY = otherY - prevY;
					// just in case there are several vertices with the same coordinate
					if ( ( poX === 0 ) && ( poY === 0 ) )		continue;	// vOther == vertex.mprev
				var voX = otherX - vertX,  voY = otherY - vertY;
					if ( ( voX === 0 ) && ( voY === 0 ) )		continue;	// vOther == vertex
				var noX = otherX - nextX,  noY = otherY - nextY;
					if ( ( noX === 0 ) && ( noY === 0 ) )		continue;	// vOther == vertex.mnext

				// if vOther is inside triangle abc -> not an ear to cut off
				if ( ( ( vnX * voY - vnY * voX ) >= PNLTRI.Math.EPSILON_N ) &&
					 ( ( pvX * poY - pvY * poX ) >= PNLTRI.Math.EPSILON_N ) &&
					 ( ( npX * noY - npY * noX ) >= PNLTRI.Math.EPSILON_N ) ) return false;
			}
			return true;

		}

		var myPolyData = this.polyData;
		var startSeg = myPolyData.getFirstSegment();

		// create a counter-clockwise ordered doubly linked list (monoChain links)

		var cursor = startSeg;
		if ( myPolyData.isClockWise( startSeg ) ) {
			do {	// reverses chain order
				cursor.mprev = cursor.snext;
				cursor.mnext = cursor.sprev;
				cursor = cursor.sprev;
			} while ( cursor != startSeg );
			myPolyData.set_PolyLeft_wrong(0);
		} else {
			do {
				cursor.mprev = cursor.sprev;
				cursor.mnext = cursor.snext;
				cursor = cursor.snext;
			} while ( cursor != startSeg );
		}

		//  remove all vertices except 2, creating 1 triangle every time

		var vertex = startSeg;
		var fullLoop = vertex;   // prevent infinite loop on "defective" polygons

		while ( vertex.mnext != vertex.mprev ) {
			if ( isEarAt( vertex ) ) {
				// found a triangle ear to cut off
				this.polyData.addTriangle( vertex.mprev.vFrom, vertex.vFrom, vertex.mnext.vFrom );
				// remove vertex from the remaining chain
				vertex.mprev.mnext = vertex.mnext;
				vertex.mnext.mprev = vertex.mprev;
				vertex = vertex.mnext;
				fullLoop = vertex;			// reset error detection
			} else {
				vertex = vertex.mnext;
				// loop?: probably non-simple polygon -> stop with error
				if ( vertex == fullLoop )	return false;
			}
		}

		return true;

	},

/*	// takes one element of a double linked segment list
	//	works on array of vertices

	triangulate_polygon_no_holes: function () {
		var startSeg = this.polyData.getFirstSegment();

		function vertList( inStartSeg ) {
			var verts = [];
			// we want a counter-clockwise polygon in verts
			var doubleArea = 0.0;
			var cursor = inStartSeg;
			var p,q;
			var idx = 0;
			do {
				p = cursor.sprev.vFrom;
				q = cursor.vFrom;
				doubleArea += p.x * q.y - q.x * p.y;
				verts[idx++] = q;
				cursor = cursor.snext;
			} while ( cursor != inStartSeg );
			if ( doubleArea < 0.0 ) {
				verts = verts.reverse();
				var tmp = verts.pop();
				verts.unshift( tmp );
			}
			return	verts;
		}

		function snip( verts, u, v, w, n ) {

			var ax = verts[ u ].x;
			var ay = verts[ u ].y;

			var bx = verts[ v ].x;
			var by = verts[ v ].y;

			var cx = verts[ w ].x;
			var cy = verts[ w ].y;

			if ( PNLTRI.Math.EPSILON_P > ( ( bx - ax ) * ( cy - ay ) - ( by - ay ) * ( cx - ax ) ) ) return false;

			var aX, aY, bX, bY, cX, cY;

			aX = cx - bx;  aY = cy - by;
			bX = ax - cx;  bY = ay - cy;
			cX = bx - ax;  cY = by - ay;

			var p, px, py;

			var apx, apy, bpx, bpy, cpx, cpy;
			var cCROSSap, bCROSScp, aCROSSbp;

			for ( p = 0; p < n; p ++ ) {

				px = verts[ p ].x
				py = verts[ p ].y

				apx = px - ax;  apy = py - ay;
					if ( ( apx == 0 ) && ( apy == 0 ) )		continue;
				bpx = px - bx;  bpy = py - by;
					if ( ( bpx == 0 ) && ( bpy == 0 ) )		continue;
				cpx = px - cx;  cpy = py - cy;
					if ( ( cpx == 0 ) && ( cpy == 0 ) )		continue;

				// see if p is inside triangle abc

				aCROSSbp = aX * bpy - aY * bpx;
				cCROSSap = cX * apy - cY * apx;
				bCROSScp = bX * cpy - bY * cpx;

				if ( ( aCROSSbp >= PNLTRI.Math.EPSILON_N ) &&
					 ( bCROSScp >= PNLTRI.Math.EPSILON_N ) &&
					 ( cCROSSap >= PNLTRI.Math.EPSILON_N ) ) return false;

			}

			return true;

		};

		var result = [];

		var	verts = vertList( startSeg );

		var n = verts.length;
		var nv = n;

		var u, v, w;

		//  remove nv - 2 vertices, creating 1 triangle every time

		var count = 2 * nv;   // error detection

		for ( v = nv - 1; nv > 2; ) {

			// if we loop, it is probably a non-simple polygon

			if ( ( count -- ) <= 0 )	return false;

			// three consecutive vertices in current polygon, <u,v,w>

			u = v; 	 	if ( nv <= u ) u = 0;     // previous
			v = u + 1;  if ( nv <= v ) v = 0;     // new v
			w = v + 1;  if ( nv <= w ) w = 0;     // next

			if ( snip( verts, u, v, w, nv ) ) {

				// output Triangle

				this.polyData.addTriangle( verts[ u ], verts[ v ], verts[ w ] );

				// remove v from the remaining polygon

				var s, t;

				for ( s = v, t = v + 1; t < nv; s++, t++ ) {

					verts[ s ] = verts[ t ];

				}

				nv --;

				v --;
				if ( v < 0 )	v = nv-1;

				// reset error detection counter

				count = 2 * nv;

			}

		}

		return true;

	},		*/

};

/**
 * @author jahting / http://www.ameco.tv/
 *
 *	Algorithm to create the trapezoidation of a polygon with holes
 *	 according to Seidel's algorithm [Sei91]
 */

/** @constructor */
PNLTRI.Trapezoid = function ( inHigh, inLow, inLeft, inRight ) {

	this.vHigh = inHigh ? inHigh : { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY };
	this.vLow  = inLow  ? inLow  : { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY };

	this.lseg = inLeft;
	this.rseg = inRight;

//	this.uL = null;				// -> Trapezoid: upper left neighbor
//	this.uR = null;				// -> Trapezoid: upper right neighbor
//	this.dL = null;				// -> Trapezoid: lower left neighbor
//	this.dR = null;				// -> Trapezoid: lower right neighbor

//	this.sink = null;			// link to corresponding SINK-Node in QueryStructure

//	this.usave = null;			// temp: uL/uR, preserved for next step
//	this.uleft = null;			// temp: from uL? (true) or uR (false)

	this.depth = -1;			// no depth assigned yet

	this.monoDone = false;		// monotonization: done with trying to split this trapezoid ?

};

PNLTRI.Trapezoid.prototype = {

	constructor: PNLTRI.Trapezoid,

	clone: function () {
		var newTrap = new PNLTRI.Trapezoid( this.vHigh, this.vLow, this.lseg, this.rseg );

		newTrap.uL = this.uL;
		newTrap.uR = this.uR;

		newTrap.dL = this.dL;
		newTrap.dR = this.dR;

		newTrap.sink = this.sink;

		return	newTrap;
	},


	splitOffLower: function ( inSplitPt ) {
		var trLower = this.clone();				// new lower trapezoid

		this.vLow = trLower.vHigh = inSplitPt;

		// L/R unknown, anyway changed later
		this.dL = trLower;		// setBelow
		trLower.uL = this;		// setAbove
		this.dR = trLower.uR = null;

		// setAbove
		if ( trLower.dL )	trLower.dL.uL = trLower;	// dL always connects to uL
		if ( trLower.dR )	trLower.dR.uR = trLower;	// dR always connects to uR

		return	trLower;
	},

};


/*==============================================================================
 *
 *============================================================================*/

// PNLTRI.qsCounter = 0;

/** @constructor */
PNLTRI.QsNode = function ( inTrapezoid ) {
//	this.qsId = PNLTRI.qsCounter++;				// Debug only
	// Only SINK-nodes are created directly.
	// The others originate from splitting trapezoids
	// - by a horizontal line: SINK-Node -> Y-Node
	// - by a segment: SINK-Node -> X-Node
	this.trap = inTrapezoid;
	inTrapezoid.sink = this;
};

PNLTRI.QsNode.prototype = {

	constructor: PNLTRI.QsNode,

};

/*==============================================================================
 *
 *============================================================================*/

/** @constructor */
PNLTRI.QueryStructure = function ( inPolygonData ) {
	// initialise the query structure and trapezoid list
	var initialTrap = new PNLTRI.Trapezoid( null, null, null, null );
	this.trapArray = [];
	this.appendTrapEntry( initialTrap );

//	PNLTRI.qsCounter = 0;
	this.root = new PNLTRI.QsNode( initialTrap );

	if ( inPolygonData ) {
		/*
		 * adds and initializes specific attributes for all segments
		 *	// -> QueryStructure: roots of partial tree where vertex is located
		 *	rootFrom, rootTo:	for vFrom, vTo
		 *	// marker
		 *	is_inserted:	already inserted into QueryStructure ?
		 */
		var segListArray = inPolygonData.getSegments();
		for ( var i = 0; i < segListArray.length; i++ ) {
			segListArray[i].rootFrom = segListArray[i].rootTo = this.root;
			segListArray[i].is_inserted = false;
		}
	}
};

PNLTRI.QueryStructure.prototype = {

	constructor: PNLTRI.QueryStructure,

	getRoot: function () {
		return this.root;
	},


	appendTrapEntry: function ( inTrapezoid ) {
		inTrapezoid.trapID = this.trapArray.length;			// for Debug
		this.trapArray.push( inTrapezoid );
	},
	cloneTrap: function ( inTrapezoid ) {
		var trap = inTrapezoid.clone();
		this.appendTrapEntry( trap );
		return	trap;
	},


	splitNodeAtPoint: function ( inNode, inPoint, inReturnUpper ) {
		// inNode: SINK-Node with trapezoid containing inPoint
		var trUpper = inNode.trap;							// trUpper: trapezoid includes the point
		if (trUpper.vHigh == inPoint)	return	inNode;				// (ERROR) inPoint is already inserted
		if (trUpper.vLow == inPoint)	return	inNode;				// (ERROR) inPoint is already inserted
		var trLower = trUpper.splitOffLower( inPoint );		// trLower: new lower trapezoid
		this.appendTrapEntry( trLower );

		// SINK-Node -> Y-Node
		inNode.yval = inPoint;
		inNode.trap = null;

		inNode.right = new PNLTRI.QsNode( trUpper );		// Upper trapezoid sink
		inNode.left = new PNLTRI.QsNode( trLower );			// Lower trapezoid sink

		return	inReturnUpper ? trUpper.sink : trLower.sink;
	},


	/*
	 * Mathematics & Geometry helper methods
	 */

	fpEqual: function ( inNum0, inNum1 ) {
		 return		Math.abs( inNum0 - inNum1 ) < PNLTRI.Math.EPSILON_P;
	},


	// Checks, whether the vertex inPt is to the left of line segment inSeg.
	//	Returns:
	//		>0: inPt is left of inSeg,
	//		<0: inPt is right of inSeg,
	//		=0: inPt is co-linear with inSeg
	//
	//	ATTENTION: always viewed from -y, not as if moving along the segment chain !!

	is_left_of: function ( inSeg, inPt, inBetweenY ) {
		var retVal;
		var dXfrom = inSeg.vFrom.x - inPt.x;
		var dXto = inSeg.vTo.x - inPt.x;
		var dYfromZero = this.fpEqual( inSeg.vFrom.y, inPt.y );
		if ( this.fpEqual( inSeg.vTo.y, inPt.y ) ) {
			if ( dYfromZero )	return 0;		// all points on a horizontal line
			retVal = dXto;
		} else if ( dYfromZero ) {
			retVal = dXfrom;
/*		} else if ( inBetweenY && ( dXfrom * dXto > 0 ) ) {
			// both x-coordinates of inSeg are on the same side of inPt
			if ( Math.abs( dXto ) >= PNLTRI.Math.EPSILON_P )	return	dXto;
			retVal = dXfrom;	*/
		} else {
			if ( inSeg.upward ) {
				return	PNLTRI.Math.ptsCrossProd( inSeg.vFrom, inSeg.vTo, inPt );
			} else {
				return	PNLTRI.Math.ptsCrossProd( inSeg.vTo, inSeg.vFrom, inPt );
			}
		}
		if ( Math.abs( retVal ) < PNLTRI.Math.EPSILON_P )		return	0;
		return	retVal;
	},


	/*
	 * Query structure main methods
	 */

	//	This method finds the Nodes in the QueryStructure corresponding
	//   to the trapezoids that contain the endpoints of inSegment,
	//	 starting from Nodes rootFrom/rootTo and replacing them with the results.

	segNodes: function ( inSegment ) {
		this.ptNode( inSegment, true );
		this.ptNode( inSegment, false );
	},

	// TODO: may need to prevent infinite loop in case of messed up
	//	trapezoid structure (s. test_add_segment_special_6)

	ptNode: function ( inSegment, inUseFrom ) {
		var ptMain, ptOther, qsNode;
		if ( inUseFrom ) {
			ptMain = inSegment.vFrom;
			ptOther = inSegment.vTo;		// used if ptMain is not sufficient
			qsNode = inSegment.rootFrom;
		} else {
			ptMain = inSegment.vTo;
			ptOther = inSegment.vFrom;
			qsNode = inSegment.rootTo;
		}
		var compPt, compRes;
		var isInSegmentShorter;

		while ( qsNode ) {
			if ( qsNode.yval ) {			// Y-Node: horizontal line
											// 4 times as often as X-Node
				qsNode = ( PNLTRI.Math.compare_pts_yx( ( ( ptMain == qsNode.yval ) ?	// is the point already inserted ?
									ptOther : ptMain ), qsNode.yval ) == -1 ) ?
									qsNode.left : qsNode.right;						// below : above
			} else if ( qsNode.seg ) {		// X-Node: segment (~vertical line)
											// 0.8 to 1.5 times as often as SINK-Node
				if ( ( ptMain == qsNode.seg.vFrom ) ||
					 ( ptMain == qsNode.seg.vTo ) ) {
					// the point is already inserted
					if ( this.fpEqual( ptMain.y, ptOther.y ) ) {
						// horizontal segment
						if ( !this.fpEqual( qsNode.seg.vFrom.y, qsNode.seg.vTo.y ) ) {
							qsNode = ( ptOther.x < ptMain.x ) ? qsNode.left : qsNode.right;		// left : right
						} else {	// co-linear horizontal reversal: test_add_segment_special_7
							if ( ptMain == qsNode.seg.vFrom ) {
								// connected at qsNode.seg.vFrom
//								console.log("ptNode: co-linear horizontal reversal, connected at qsNode.seg.vFrom", inUseFrom, inSegment, qsNode )
								isInSegmentShorter = inSegment.upward ?
										( ptOther.x >= qsNode.seg.vTo.x ) :
										( ptOther.x <  qsNode.seg.vTo.x );
								qsNode = ( isInSegmentShorter ?
												inSegment.sprev.upward :
												qsNode.seg.snext.upward ) ? qsNode.right : qsNode.left;		// above : below
							} else {
								// connected at qsNode.seg.vTo
//								console.log("ptNode: co-linear horizontal reversal, connected at qsNode.seg.vTo", inUseFrom, inSegment, qsNode );
								isInSegmentShorter = inSegment.upward ?
										( ptOther.x <  qsNode.seg.vFrom.x ) :
										( ptOther.x >= qsNode.seg.vFrom.x );
								qsNode = ( isInSegmentShorter ?
												inSegment.snext.upward :
												qsNode.seg.sprev.upward ) ? qsNode.left : qsNode.right;		// below : above
							}
						}
						continue;
					} else {
						compRes = this.is_left_of( qsNode.seg, ptOther, false );
						if ( compRes === 0 ) {
							// co-linear reversal (not horizontal)
							//	a co-linear continuation would not reach this point
							//  since the previous Y-node comparison would have led to a sink instead
//							console.log("ptNode: co-linear, going back on previous segment", ptMain, ptOther, qsNode );
							// now as we have two consecutive co-linear segments we have to avoid a cross-over
							//	for this we need the far point on the "next" segment to the SHORTER of our two
							//	segments to avoid that "next" segment to cross the longer of our two segments
							if ( ptMain == qsNode.seg.vFrom ) {
								// connected at qsNode.seg.vFrom
//								console.log("ptNode: co-linear, going back on previous segment, connected at qsNode.seg.vFrom", ptMain, ptOther, qsNode );
								isInSegmentShorter = inSegment.upward ?
										( ptOther.y >= qsNode.seg.vTo.y ) :
										( ptOther.y <  qsNode.seg.vTo.y );
								compRes = isInSegmentShorter ?
										this.is_left_of( qsNode.seg, inSegment.sprev.vFrom, false ) :
										-this.is_left_of( qsNode.seg, qsNode.seg.snext.vTo, false );
							} else {
								// connected at qsNode.seg.vTo
//								console.log("ptNode: co-linear, going back on previous segment, connected at qsNode.seg.vTo", ptMain, ptOther, qsNode );
								isInSegmentShorter = inSegment.upward ?
										( ptOther.y <  qsNode.seg.vFrom.y ) :
										( ptOther.y >= qsNode.seg.vFrom.y );
								compRes = isInSegmentShorter ?
										this.is_left_of( qsNode.seg, inSegment.snext.vTo, false ) :
										-this.is_left_of( qsNode.seg, qsNode.seg.sprev.vFrom, false );
							}
						}
					}
				} else {
/*					if ( ( PNLTRI.Math.compare_pts_yx( ptMain, qsNode.seg.vFrom ) *			// TODO: Testcase
							PNLTRI.Math.compare_pts_yx( ptMain, qsNode.seg.vTo )
						   ) == 0 ) {
						console.log("ptNode: Pts too close together#2: ", ptMain, qsNode.seg );
					}		*/
					compRes = this.is_left_of( qsNode.seg, ptMain, true );
					if ( compRes === 0 ) {
						// touching: ptMain lies on qsNode.seg but is none of its endpoints
						//	should happen quite seldom
						compRes = this.is_left_of( qsNode.seg, ptOther, false );
						if ( compRes === 0 ) {
							// co-linear: inSegment and qsNode.seg
							//	includes case with ptOther connected to qsNode.seg
							var tmpPtOther = inUseFrom ? inSegment.sprev.vFrom : inSegment.snext.vTo;
							compRes = this.is_left_of( qsNode.seg, tmpPtOther, false );
						}
					}
				}
				if ( compRes > 0 ) {
					qsNode = qsNode.left;
				} else if ( compRes < 0 ) {
					qsNode = qsNode.right;
				} else {
					// ???	TODO - not reached with current tests
					//				possible at all ?
					return qsNode;
					// qsNode = qsNode.left;		// left
					// qsNode = qsNode.right;		// right
				}
			} else {		// SINK-Node: trapezoid area
							// least often
				if ( !qsNode.trap )	{ console.log("ptNode: unknown type", qsNode); }
				if ( inUseFrom )	{ inSegment.rootFrom = qsNode; }
				else				{ inSegment.rootTo = qsNode; }
				return qsNode;
			}
		}	// end while - should not exit here
	},


 	// Add a new segment into the trapezoidation and update QueryStructure and Trapezoids
	// 1) locates the two endpoints of the segment in the QueryStructure and inserts them
	// 2) goes from the high-end trapezoid down to the low-end trapezoid
	//		changing all the trapezoids in between.
	// Except for the high-end and low-end no new trapezoids are created.
	// For all in between either:
	// - the existing trapezoid is restricted to the left of the new segment
	//		and on the right side the trapezoid from above is extended downwards
	// - or the other way round:
	//	 the existing trapezoid is restricted to the right of the new segment
	//		and on the left side the trapezoid from above is extended downwards

	add_segment: function ( inSegment ) {
		var scope = this;

		// functions handling the relationship to the upper neighbors (uL, uR)
		//	of trNewLeft and trNewRight

		function fresh_seg_or_upward_cusp() {
			// trCurrent has at most 1 upper neighbor
			//	and should also have at least 1, since the high-point trapezoid
			//	has been split off another one, which is now above
			var trUpper = trCurrent.uL || trCurrent.uR;

			// trNewLeft and trNewRight CANNOT have been extended from above
			if ( trUpper.dL && trUpper.dR ) {
				// upward cusp: top forms a triangle

				// ATTENTION: the decision whether trNewLeft or trNewRight is the
				//	triangle trapezoid formed by the two segments has already been taken
				//	when selecting trCurrent as the left or right lower neighbor to trUpper !!

				if ( trCurrent == trUpper.dL ) {
					//	*** Case: FUC_UC_LEFT; prev: ----
					// console.log( "fresh_seg_or_upward_cusp: upward cusp, new seg to the left!" );
					//		  upper
					//   -------*-------
					//		   + \
					//	  NL  +   \
					//		 +	NR \
					//		+		\
					trNewRight.uL	= null;			// setAbove; trNewRight.uR, trNewLeft unchanged
					trUpper.dL		= trNewLeft;	// setBelow; dR: unchanged, NEVER null
				} else {
					//	*** Case: FUC_UC_RIGHT; prev: ----
					// console.log( "fresh_seg_or_upward_cusp: upward cusp, new seg from the right!" );
					//		  upper
					//   -------*-------
					//		   / +
					//		  /   +	 NR
					//		 /	NL +
					//		/		+
					trNewLeft.uR	= null;			// setAbove; trNewLeft.uL, trNewRight unchanged
					trUpper.dR		= trNewRight;	// setBelow; dL: unchanged, NEVER null
				}
			} else {
				//	*** Case: FUC_FS; prev: "splitOffLower"
				// console.log( "fresh_seg_or_upward_cusp: fresh segment, high adjacent segment still missing" );
				//		  upper
				//   -------*-------
				//		   +
				//	  NL  +
				//		 +	NR
				//		+
				trNewRight.uL = null;			// setAbove; trNewLeft unchanged, set by "splitOffLower"
				trNewRight.uR = trUpper;
				trUpper.dR = trNewRight;		// setBelow; trUpper.dL unchanged, set by "splitOffLower"
			}
 		}

		function continue_chain_from_above() {
			// trCurrent has at least 2 upper neighbors
			if ( trCurrent.usave ) {
				// 3 upper neighbors (part II)
				if ( trCurrent.uleft ) {
					//	*** Case: CC_3UN_LEFT; prev: 1B_3UN_LEFT
					// console.log( "continue_chain_from_above: 3 upper neighbors (part II): u0a, u0b, uR(usave)" );
					// => left gets one, right gets two of the upper neighbors
					// !! trNewRight cannot have been extended from above
					//		and trNewLeft must have been !!
					//		   +		/
					//	  C.uL  + C.uR / C.usave
					//    - - - -+----*----------
					//		NL	  +		NR
					trNewRight.uL = trCurrent.uR;		// setAbove
					trNewRight.uR = trCurrent.usave;
					trNewRight.uL.dL = trNewRight;		// setBelow; trNewRight.uL.dR == null, unchanged
					trNewRight.uR.dR = trNewRight;		// setBelow; trNewRight.uR.dL == null, unchanged
				} else {
					//	*** Case: CC_3UN_RIGHT; prev: 1B_3UN_RIGHT
					// console.log( "continue_chain_from_above: 3 upper neighbors (part II): uL(usave), u1a, u1b" );
					// => left gets two, right gets one of the upper neighbors
					// !! trNewLeft cannot have been extended from above
					//		and trNewRight must have been !!
					//			\		 +
					//	 C.usave \ C.uL + C.uR
					//   ---------*----+- - - -
					//			NL    +   NR
					trNewLeft.uR = trCurrent.uL;		// setAbove; first uR !!!
					trNewLeft.uL = trCurrent.usave;
					trNewLeft.uL.dL = trNewLeft;		// setBelow; dR == null, unchanged
					trNewLeft.uR.dR = trNewLeft;		// setBelow; dL == null, unchanged
				}
				trNewLeft.usave = trNewRight.usave = null;
			} else if ( trCurrent.vHigh == trFirst.vHigh ) {		// && meetsHighAdjSeg ??? TODO
				//	*** Case: CC_2UN_CONN; prev: ----
				// console.log( "continue_chain_from_above: 2 upper neighbors, fresh seg, continues high adjacent seg" );
				// !! trNewLeft and trNewRight cannot have been extended from above !!
				//	  C.uL	 /  C.uR
				//   -------*---------
				//	   NL  +	NR
				trNewRight.uR.dR = trNewRight;			// setBelow; dL == null, unchanged
				trNewLeft.uR = trNewRight.uL = null;	// setAbove; trNewLeft.uL, trNewRight.uR unchanged
			} else {
				//	*** Case: CC_2UN; prev: 1B_1UN_CONT, 2B_NOCON_RIGHT/LEFT, 2B_TOUCH_RIGHT/LEFT, 2B_COLIN_RIGHT/LEFT
				// console.log( "continue_chain_from_above: simple case, 2 upper neighbors (no usave, not fresh seg)" );
				// !! trNewLeft XOR trNewRight will have been extended from above !!
				//	  C.uL	 +  C.uR
				//   -------+---------
				//	   NL  +	NR
				if ( trNewRight == trCurrent ) {		// trNewLeft has been extended from above
					// setAbove
					trNewRight.uL = trNewRight.uR;
					trNewRight.uR = null;
					// setBelow; dR: unchanged, is NOT always null (prev: 2B_NOCON_LEFT, 2B_TOUCH_LEFT, 2B_COLIN_LEFT)
					trNewRight.uL.dL = trNewRight;
				} else {								// trNewRight has been extended from above
					trNewLeft.uR = trNewLeft.uL;	// setAbove; first uR !!!
					trNewLeft.uL = null;
				}
			}
		}

		// functions handling the relationship to the lower neighbors (dL, dR)
		//	of trNewLeft and trNewRight
		// trNewLeft or trNewRight MIGHT have been extended from above
		//  !! in that case dL and dR are different from trCurrent and MUST be set here !!

		function only_one_trap_below( inTrNext ) {

			if ( trCurrent.vLow == trLast.vLow ) {
				// final part of segment

				if ( meetsLowAdjSeg ) {
					// downward cusp: bottom forms a triangle

					// ATTENTION: the decision whether trNewLeft and trNewRight are to the
					//	left or right of the already inserted segment the new one meets here
					//	has already been taken when selecting trLast to the left or right
					//	of that already inserted segment !!

					if ( trCurrent.dL ) {
						//	*** Case: 1B_DC_LEFT; next: ----
						// console.log( "only_one_trap_below: downward cusp, new seg from the left!" );
						//		+		/
						//		 +  NR /
						//	  NL  +	  /
						//		   + /
						//   -------*-------
						//	   C.dL = next

						// setAbove
						inTrNext.uL = trNewLeft;	// uR: unchanged, NEVER null
						// setBelow part 1
						trNewLeft.dL = inTrNext;
						trNewRight.dR = null;
					} else {
						//	*** Case: 1B_DC_RIGHT; next: ----
						// console.log( "only_one_trap_below: downward cusp, new seg to the right!" );
						//		\		+
						//		 \  NL +
						//		  \	  +  NR
						//		   \ +
						//   -------*-------
						//	   C.dR = next

						// setAbove
						inTrNext.uR = trNewRight;	// uL: unchanged, NEVER null
						// setBelow part 1
						trNewLeft.dL = null;
						trNewRight.dR = inTrNext;
					}
				} else {
					//	*** Case: 1B_1UN_END; next: ----
					// console.log( "only_one_trap_below: simple case, new seg ends here, low adjacent seg still missing" );
					//			  +
					//		NL	 +  NR
					//			+
					//   ------*-------
					//		  next

					// setAbove
					inTrNext.uL = trNewLeft;									// trNewLeft must
					inTrNext.uR = trNewRight;		// must
					// setBelow part 1
					trNewLeft.dL = trNewRight.dR = inTrNext;					// Error
//					trNewRight.dR = inTrNext;
				}
				// setBelow part 2
				trNewLeft.dR = trNewRight.dL = null;
			} else {
				// NOT final part of segment

				if ( inTrNext.uL && inTrNext.uR ) {
					// inTrNext has two upper neighbors
					// => a segment ends on the upper Y-line of inTrNext
					// => inTrNext has temporarily 3 upper neighbors
					// => marks whether the new segment cuts through
					//		uL or uR of inTrNext and saves the other in .usave
					if ( inTrNext.uL == trCurrent ) {
						//	*** Case: 1B_3UN_LEFT; next: CC_3UN_LEFT
						// console.log( "only_one_trap_below: inTrNext has 3 upper neighbors (part I): u0a, u0b, uR(usave)" );
						//		 +		  /
						//	  NL  +	 NR	 /
						//		   +	/
						//   - - - -+--*----
						//			 +
						//		  next
//						if ( inTrNext.uR != trNewRight ) {		// for robustness	TODO: prevent
							inTrNext.usave = inTrNext.uR;
							inTrNext.uleft = true;
							// trNewLeft: L/R undefined, will be extended down and changed anyway
						// } else {
							// ERROR: should not happen
							// console.log( "ERR add_segment: Trapezoid Loop right", inTrNext, trCurrent, trNewLeft, trNewRight, inSegment, this );
//						}
					} else {
						//	*** Case: 1B_3UN_RIGHT; next: CC_3UN_RIGHT
						// console.log( "only_one_trap_below: inTrNext has 3 upper neighbors (part I): uL(usave), u1a, u1b" );
						//	 \		   +
						//	  \	  NL  +  NR
						//	   \	 +
						//   ---*---+- - - -
						//		   +
						//		  next
//						if ( inTrNext.uL != trNewLeft ) {		// for robustness	TODO: prevent
							inTrNext.usave = inTrNext.uL;
							inTrNext.uleft = false;
							// trNewRight: L/R undefined, will be extended down and changed anyway
						// } else {
							// ERROR: should not happen
							// console.log( "ERR add_segment: Trapezoid Loop left", inTrNext, trCurrent, trNewLeft, trNewRight, inSegment, this );
//						}
					}
				//} else {
					//	*** Case: 1B_1UN_CONT; next: CC_2UN
					// console.log( "only_one_trap_below: simple case, new seg continues down" );
					//			  +
					//		NL	 +  NR
					//			+
					//   ------+-------
					//	 	  +
					//		next

					// L/R for one side undefined, which one is not fixed
					//	but that one will be extended down and changed anyway
					// for the other side, vLow must lie at the opposite end
					//	thus both are set accordingly
				}
				// setAbove
				inTrNext.uL = trNewLeft;
				inTrNext.uR = trNewRight;
				// setBelow
				trNewLeft.dR = trNewRight.dL = inTrNext;
				trNewLeft.dL = trNewRight.dR = null;
			}
		}

		function two_trap_below() {
			// Find out which one (dL,dR) is intersected by this segment and
			//	continue down that one
			var trNext;
			if ( ( trCurrent.vLow == trLast.vLow ) && meetsLowAdjSeg ) {	// meetsLowAdjSeg necessary? TODO
				//	*** Case: 2B_CON_END; next: ----
				// console.log( "two_trap_below: finished, meets low adjacent segment" );
				//			  +
				//		NL	 +  NR
				//			+
				//   ------*-------
				//	 		\  C.dR
				//	  C.dL	 \

				// setAbove
				trCurrent.dL.uL = trNewLeft;
				trCurrent.dR.uR = trNewRight;
				// setBelow; sequence of assignments essential, just in case: trCurrent == trNewLeft
				trNewLeft.dL = trCurrent.dL;
				trNewRight.dR = trCurrent.dR;
				trNewLeft.dR = trNewRight.dL = null;

				trNext = null;	      	// segment finished
			} else {
				// setAbove part 1
				trCurrent.dL.uL = trNewLeft;
				trCurrent.dR.uR = trNewRight;

				var goDownRight;
				// passes left or right of an already inserted NOT connected segment
				//	trCurrent.vLow: high-end of existing segment
				var compRes = scope.is_left_of( inSegment, trCurrent.vLow, true );
				if ( compRes > 0 ) {				// trCurrent.vLow is left of inSegment
					//	*** Case: 2B_NOCON_RIGHT; next: CC_2UN
					// console.log( "two_trap_below: (intersecting dR)" );
					//		 +
					//	  NL  +  NR
					//		   +
					//   ---*---+- - - -
					//		 \	 +
					//	 C.dL \	C.dR
					goDownRight = true;
				} else if ( compRes < 0 ) {			// trCurrent.vLow is right of inSegment
					//	*** Case: 2B_NOCON_LEFT; next: CC_2UN
					// console.log( "two_trap_below: (intersecting dL)" );
					//			  +
					//		NL	 +  NR
					//			+
					//    - - -+---*-------
					//	 	  +		\  C.dR
					//	 	 C.dL	 \
					goDownRight = false;
				} else {							// trCurrent.vLow lies ON inSegment
					var vLowSeg = trCurrent.dL.rseg;
					var directionIsUp = vLowSeg.upward;
					var otherPt = directionIsUp ? vLowSeg.vFrom : vLowSeg.vTo;
					compRes = scope.is_left_of( inSegment, otherPt, false );
					if ( compRes > 0 ) {				// otherPt is left of inSegment
						//	*** Case: 2B_TOUCH_RIGHT; next: CC_2UN
						// console.log( "two_trap_below: vLow ON new segment, touching from right" );
						//		 +
						//	  NL  +  NR
						//		   +
						//   -------*- - - -
						//		   / +
						//	 C.dL /	C.dR
						goDownRight = true;		// like intersecting dR
					} else if ( compRes < 0 ) {			// otherPt is right of inSegment
						//	*** Case: 2B_TOUCH_LEFT; next: CC_2UN
						// console.log( "two_trap_below: vLow ON new segment, touching from left" );
						//			  +
						//		NL	 +  NR
						//			+
						//    - - -*-------
						//	 	  +	\  C.dR
						//	  C.dL	 \
						goDownRight = false;	// like intersecting dL
					} else {							// otherPt lies ON inSegment
						vLowSeg = directionIsUp ? vLowSeg.snext : vLowSeg.sprev;		// other segment with trCurrent.vLow
						otherPt = directionIsUp ? vLowSeg.vTo : vLowSeg.vFrom;
						compRes = scope.is_left_of( inSegment, otherPt, false );
						if ( compRes > 0 ) {				// otherPt is left of inSegment
							//	*** Case: 2B_COLIN_RIGHT; next: CC_2UN
							// console.log( "two_trap_below: vLow ON new segment, touching from right" );
							//		  +
							//	  NL   +  NR
							//   -------*- - - -
							//	  C.dL 	\+  C.dR
							//			 \+
							goDownRight = true;		// like intersecting dR
					//	} else if ( compRes == 0 ) {		//	NOT POSSIBLE, since 3 points on a line is prevented during input of polychains
					//		goDownRight = true;		// like intersecting dR
						} else {							// otherPt is right of inSegment
							//	*** Case: 2B_COLIN_LEFT; next: CC_2UN
							// console.log( "two_trap_below: vLow ON new segment, touching from left" );
							//			   +
							//		NL	  +  NR
							//    - - - -*-------
							//	  C.dL	+/  C.dR
							//		   +/
							goDownRight = false;		// TODO: for test_add_segment_special_4 -> like intersecting dL
						}
					}
				}
				if ( goDownRight ) {
					trNext = trCurrent.dR;
					// setAbove part 2
					trCurrent.dR.uL = trNewLeft;
					// setBelow part 1
					trNewLeft.dL = trCurrent.dL;
					trNewRight.dR = null;	// L/R undefined, will be extended down and changed anyway
				} else {
					trNext = trCurrent.dL;
					// setAbove part 2
					trCurrent.dL.uR = trNewRight;
					// setBelow part 1
					trNewRight.dR = trCurrent.dR;
					trNewLeft.dL = null;	// L/R undefined, will be extended down and changed anyway
				}
				// setBelow part 2
				trNewLeft.dR = trNewRight.dL = trNext;
			}

 			return	trNext;
		}

		//
		//	main function body
		//

/*		if ( ( inSegment.sprev.vTo != inSegment.vFrom ) || ( inSegment.vTo != inSegment.snext.vFrom ) ) {
			console.log( "add_segment: inconsistent point order of adjacent segments: ",
						 inSegment.sprev.vTo, inSegment.vFrom, inSegment.vTo, inSegment.snext.vFrom );
			return;
		}		*/

		//	Find the top-most and bottom-most intersecting trapezoids -> rootXXX
		this.segNodes( inSegment );

		var segLowVert , segLowNode, meetsLowAdjSeg;		// y-min vertex
		var segHighVert, segHighNode, meetsHighAdjSeg;		// y-max vertex

		if ( inSegment.upward ) {
			segLowVert	= inSegment.vFrom;
			segHighVert	= inSegment.vTo;
			segLowNode		= inSegment.rootFrom;
			segHighNode		= inSegment.rootTo;
			// was lower point already inserted earlier? => segments meet at their ends
			meetsLowAdjSeg	= inSegment.sprev.is_inserted;
			// was higher point already inserted earlier? => segments meet at their ends
			meetsHighAdjSeg	= inSegment.snext.is_inserted;
		} else {
			segLowVert	= inSegment.vTo;
			segHighVert	= inSegment.vFrom;
			segLowNode		= inSegment.rootTo;
			segHighNode		= inSegment.rootFrom;
			meetsLowAdjSeg	= inSegment.snext.is_inserted;
			meetsHighAdjSeg	= inSegment.sprev.is_inserted;
		}

		//	insert higher vertex into QueryStructure
		if ( !meetsHighAdjSeg ) {
			// higher vertex not yet inserted => split trapezoid horizontally
			var tmpNode = this.splitNodeAtPoint( segHighNode, segHighVert, false );
			// move segLowNode to new (lower) trapezoid, if it was the one which was just split
			if ( segHighNode == segLowNode )	segLowNode = tmpNode;
			segHighNode = tmpNode;
		}
		var trFirst = segHighNode.trap;		// top-most trapezoid for this segment

		// check for robustness		// TODO: prevent
		if ( !trFirst.uL && !trFirst.uR ) {
			console.log("ERR add_segment: missing trFirst.uX: ", trFirst );
			return;
		}
		if ( trFirst.vHigh != segHighVert ) {
			console.log("ERR add_segment: trFirstHigh != segHigh: ", trFirst );
			return;
		}

		//	insert lower vertex into QueryStructure
		if ( !meetsLowAdjSeg ) {
			// lower vertex not yet inserted => split trapezoid horizontally
			segLowNode = this.splitNodeAtPoint( segLowNode, segLowVert, true );
		}
		var trLast = segLowNode.trap;			// bottom-most trapezoid for this segment

		//
		// Thread the segment into the query "tree" from top to bottom.
		// All the trapezoids which are intersected by inSegment are "split" into two.
		// For each the SINK-QsNode is converted into an X-Node and
		//  new sinks for the new partial trapezoids are added.
		// In fact a real split only happens at the top and/or bottom end of the segment
		//	since at every y-line seperating two trapezoids is traverses it
		//	cuts off the "beam" from the y-vertex on one side, so that at that side
		//	the trapezoid from above can be extended down.
		//

		var trCurrent = trFirst;

		var trNewLeft, trNewRight, trPrevLeft, trPrevRight;

		var counter = this.trapArray.length + 2;		// just to prevent infinite loop
		var trNext;
		while ( trCurrent ) {
			if ( --counter < 0 ) {
				console.log( "ERR add_segment: infinite loop", trCurrent, inSegment, this );
				return;
			}
			if ( !trCurrent.dL && !trCurrent.dR ) {
				// ERROR: no successors, cannot arise if data is correct
				console.log( "ERR add_segment: missing successors", trCurrent, inSegment, this );
				return;
			}

			var qs_trCurrent = trCurrent.sink;
			// SINK-Node -> X-Node
			qs_trCurrent.seg = inSegment;
			qs_trCurrent.trap = null;
			//
			// successive trapezoids bordered by the same segments are merged
			//  by extending the trPrevRight or trPrevLeft down
			//  and redirecting the parent X-Node to the extended sink
			// !!! destroys tree structure since several nodes now point to the same SINK-Node !!!
			// TODO: maybe it's not a problem;
			//  merging of X-Nodes is no option, since they are used as "rootFrom/rootTo" !
			//
			if ( trPrevRight && ( trPrevRight.rseg == trCurrent.rseg ) ) {
				// console.log( "add_segment: extending right predecessor down!", trPrevRight );
				trNewLeft = trCurrent;
				trNewRight = trPrevRight;
				trNewRight.vLow = trCurrent.vLow;
				// redirect parent X-Node to extended sink
				qs_trCurrent.left = new PNLTRI.QsNode( trNewLeft );			// trCurrent -> left SINK-Node
				qs_trCurrent.right = trPrevRight.sink;						// deforms tree by multiple links to trPrevRight.sink
			} else if ( trPrevLeft && ( trPrevLeft.lseg == trCurrent.lseg ) ) {
				// console.log( "add_segment: extending left predecessor down!", trPrevLeft );
				trNewRight = trCurrent;
				trNewLeft = trPrevLeft;
				trNewLeft.vLow = trCurrent.vLow;
				// redirect parent X-Node to extended sink
				qs_trCurrent.left = trPrevLeft.sink;						// deforms tree by multiple links to trPrevLeft.sink
				qs_trCurrent.right = new PNLTRI.QsNode( trNewRight );		// trCurrent -> right SINK-Node
			} else {
				trNewLeft = trCurrent;
				trNewRight = this.cloneTrap(trCurrent);
				qs_trCurrent.left = new PNLTRI.QsNode( trNewLeft );			// trCurrent -> left SINK-Node
				qs_trCurrent.right = new PNLTRI.QsNode( trNewRight );		// new clone -> right SINK-Node
			}

			// handle neighbors above
			if ( trCurrent.uL && trCurrent.uR )	{
				continue_chain_from_above();
			} else {
				fresh_seg_or_upward_cusp();
			}

			// handle neighbors below
			if ( trCurrent.dL && trCurrent.dR ) {
				trNext = two_trap_below();
			} else {
				if ( trCurrent.dL ) {
					// console.log( "add_segment: only_one_trap_below! (dL)" );
					trNext = trCurrent.dL;
				} else {
					// console.log( "add_segment: only_one_trap_below! (dR)" );
					trNext = trCurrent.dR;
				}
				only_one_trap_below( trNext );
			}

			if ( trNewLeft.rseg )	trNewLeft.rseg.trLeft = trNewRight;
			if ( trNewRight.lseg )	trNewRight.lseg.trRight = trNewLeft;
			trNewLeft.rseg = trNewRight.lseg  = inSegment;
			inSegment.trLeft = trNewLeft;
			inSegment.trRight = trNewRight;

			// further loop-step down ?
			if ( trCurrent.vLow != trLast.vLow ) {
				trPrevLeft = trNewLeft;
				trPrevRight = trNewRight;

				trCurrent = trNext;
			} else {
				trCurrent = null;
			}
		}	// end while

		inSegment.is_inserted = true;
		// console.log( "add_segment: ###### DONE ######" );
	},

	// Assigns a depth to all trapezoids;
	//	0: outside, 1: main polygon, 2: holes, 3:polygons in holes, ...
	// Checks segment orientation and marks those polygon chains for reversal
	//	where the polygon inside lies to their right (contour in CW, holes in CCW)
	assignDepths: function ( inPolyData ) {
		var thisDepth = [ this.trapArray[0] ];
		var nextDepth = [];

		var thisTrap, borderSeg, curDepth = 0;
		do {
			// rseg should exactely go upward on trapezoids inside the polygon (odd depth)
			var expectedRsegUpward = ( ( curDepth % 2 ) == 1 );
			while ( thisTrap = thisDepth.pop() ) {			// assignment !
				if ( thisTrap.depth != -1 )	continue;
				thisTrap.depth = curDepth;
				//
				if ( thisTrap.uL )	thisDepth.push( thisTrap.uL );
				if ( thisTrap.uR )	thisDepth.push( thisTrap.uR );
				if ( thisTrap.dL )	thisDepth.push( thisTrap.dL );
				if ( thisTrap.dR )	thisDepth.push( thisTrap.dR );
				//
				if ( ( borderSeg = thisTrap.lseg ) && ( borderSeg.trLeft.depth == -1 ) )	// assignment !
					nextDepth.push( borderSeg.trLeft );
				if ( borderSeg = thisTrap.rseg ) {											// assignment !
					if ( borderSeg.trRight.depth == -1 )
						nextDepth.push( borderSeg.trRight );
					if ( borderSeg.upward != expectedRsegUpward )
						inPolyData.set_PolyLeft_wrong( borderSeg.chainId );
				}
			}
			thisDepth = nextDepth; nextDepth = [];
			curDepth++;
		} while ( thisDepth.length > 0 );
	},

	// creates the visibility map:
	//	for each vertex the list of all vertices in CW order which are directly
	//	visible through neighboring trapezoids and thus can be connected by a diagonal

	create_visibility_map: function ( inPolygonData ) {
		// positional slots for neighboring trapezoid-diagonals
		var DIAG_UL = 0, DIAG_UM = 1, DIAG_ULR = 2, DIAG_UR = 3;
		var DIAG_DR = 4, DIAG_DM = 5, DIAG_DLR = 6, DIAG_DL = 7;

		var i, j;
		var nbVertices = inPolygonData.nbVertices();

		// initialize arrays for neighboring trapezoid-diagonals and vertices
		var myVisibleDiagonals	= new Array(nbVertices);
		for ( i = 0; i < nbVertices; i++ ) {
			myVisibleDiagonals[i] = new Array(DIAG_DL+1);
		}
		// create the list of neighboring trapezoid-diagonals
		//	put into their positional slots
		var myExternalNeighbors = new Array(nbVertices);
		for ( i = 0, j = this.trapArray.length; i < j; i++ ) {
			var curTrap = this.trapArray[i];
			var highPos = curTrap.uL ?
						( curTrap.uR ? DIAG_DM : DIAG_DL ) :
						( curTrap.uR ? DIAG_DR : DIAG_DLR );
			var lowPos = curTrap.dL ?
						( curTrap.dR ? DIAG_UM : DIAG_UL ) :
						( curTrap.dR ? DIAG_UR : DIAG_ULR );

			if ( ( curTrap.depth % 2 ) == 1 ) {		// inside ?
				if ( ( highPos == DIAG_DM ) || ( lowPos == DIAG_UM ) ||
					 ( ( highPos == DIAG_DL ) && ( lowPos == DIAG_UR ) ) ||
					 ( ( highPos == DIAG_DR ) && ( lowPos == DIAG_UL ) ) ) {
					var lhDiag = inPolygonData.appendDiagonalsEntry( {
									vFrom: curTrap.vLow, vTo: curTrap.vHigh,
									mprev: null, mnext: null, marked: false } );
					var hlDiag = inPolygonData.appendDiagonalsEntry( {
									vFrom: curTrap.vHigh, vTo: curTrap.vLow, revDiag: lhDiag,
									mprev: null, mnext: null, marked: false } );
					lhDiag.revDiag = hlDiag;
					myVisibleDiagonals[ curTrap.vLow.id][ lowPos] = lhDiag;
					myVisibleDiagonals[curTrap.vHigh.id][highPos] = hlDiag;
				}
			} else {		// outside, hole
				if ( curTrap.vHigh.id !== null )	myExternalNeighbors[curTrap.vHigh.id] = highPos;
				if ( curTrap.vLow.id  !== null )	myExternalNeighbors[ curTrap.vLow.id] = lowPos;
			}
		}
		// create the list of outgoing diagonals in the right order (CW)
		//	from the ordered list of neighboring trapezoid-diagonals
		//	- starting from an external one
		// and connect those incoming to
		var curDiag, curDiags, firstElem, fromVertex, lastIncoming;
		for ( i = 0; i < nbVertices; i++ ) {
			curDiags  = myVisibleDiagonals[i];
			firstElem = myExternalNeighbors[i];
			if ( firstElem == null )	continue;		// eg. skipped vertices (zero length, co-linear		// NOT: === !
			j = firstElem;
			lastIncoming = null;
			do {
				if ( j++ > DIAG_DL )			j = DIAG_UL;	// circular positional list
				if ( curDiag = curDiags[j] ) {
					if ( lastIncoming ) {
						curDiag.mprev = lastIncoming;
						lastIncoming.mnext = curDiag;
					} else {
						fromVertex = curDiag.vFrom;
						fromVertex.firstOutDiag = curDiag;
					}
					lastIncoming = curDiag.revDiag;
				}
			} while ( j != firstElem );
			if ( lastIncoming )		fromVertex.lastInDiag = lastIncoming;
		}
	},


};


/*==============================================================================
 *
 *============================================================================*/

/** @constructor */
PNLTRI.Trapezoider = function ( inPolygonData ) {

	this.polyData		= inPolygonData;
	this.queryStructure	= new PNLTRI.QueryStructure( this.polyData );

};

PNLTRI.Trapezoider.prototype = {

	constructor: PNLTRI.Trapezoider,


	/*
	 * Mathematics helper methods
	 */

	optimise_randomlist: function ( inOutSegListArray ) {
		// makes sure that the first N segments are one from each of the N polygon chains
		var mainIdx = 0;
		var helpIdx = this.polyData.nbPolyChains();
		if ( helpIdx == 1 )		return;
		var chainMarker = new Array(helpIdx);
		var oldSegListArray = inOutSegListArray.concat();
		for (var i=0; i<oldSegListArray.length; i++) {
			var chainId = oldSegListArray[i].chainId;
			if ( chainMarker[chainId] ) {
				inOutSegListArray[helpIdx++] = oldSegListArray[i];
			} else {
				inOutSegListArray[mainIdx++] = oldSegListArray[i];
				chainMarker[chainId] = true;
			}
		}
	},


	/*
	 * main methods
	 */

	// Creates the trapezoidation of the polygon
	//  and assigns a depth to all trapezoids (odd: inside, even: outside).

	trapezoide_polygon: function () {							// <<<< public
		var randSegListArray = this.polyData.getSegments().concat();
//		console.log( "Polygon Chains: ", dumpSegmentList( randSegListArray ) );
		PNLTRI.Math.array_shuffle( randSegListArray );
		this.optimise_randomlist( randSegListArray );
//		console.log( "Random Segment Sequence: ", dumpRandomSequence( randSegListArray ) );

		var nbSegs = randSegListArray.length;
		var myQs = this.queryStructure;

		var i, current = 0, logstar = nbSegs;
		while ( current < nbSegs ) {
			// The CENTRAL mechanism for the near-linear performance:
			//	stratefies the loop through all segments into log* parts
			//	and computes new root-Nodes for the remaining segments in each
			//	partition.
			logstar = Math.log(logstar)/Math.LN2;		// == log2(logstar)
			var partEnd = ( logstar > 1 ) ? Math.floor( nbSegs / logstar ) : nbSegs;

			// Core: adds next partition of the segments
			for (; current < partEnd; current++ ) { myQs.add_segment( randSegListArray[current] ); }
//			console.log( nbSegs, current );

			// To speed up the segment insertion into the trapezoidation
			//	the endponts of those segments not yet inserted
			//	are repeatedly pre-located,
			// thus their final location-query can start at the top of the
			//	appropriate sub-tree instead of the root of the whole
			//	query structure.
			//
			for (i = current; i < nbSegs; i++) { this.queryStructure.segNodes( randSegListArray[i] ); }
		}

		myQs.assignDepths( this.polyData );
		// cleanup to support garbage collection
		for (i = 0; i < nbSegs; i++) { randSegListArray[i].trLeft = randSegListArray[i].trRight = null; }
	},

	// Creates a visibility map:
	//	for each vertex the list of all vertices in CW order which are directly
	//	visible through neighboring trapezoids and thus can be connected by a diagonal

	create_visibility_map: function () {
		return	this.queryStructure.create_visibility_map( this.polyData );
	},

};

/**
 * @author jahting / http://www.ameco.tv/
 *
 *	Algorithm to split a polygon into uni-y-monotone sub-polygons
 *
 *	1) creates a trapezoidation of the main polygon according to Seidel's
 *	   algorithm [Sei91]
 *	2) uses diagonals of the trapezoids as additional segments
 *		to split the main polygon into uni-y-monotone sub-polygons
 */

/** @constructor */
PNLTRI.MonoSplitter = function ( inPolygonData ) {

	this.polyData = inPolygonData;

	this.trapezoider = null;

};


PNLTRI.MonoSplitter.prototype = {

	constructor: PNLTRI.MonoSplitter,


	monotonate_trapezoids: function () {					// <<<<<<<<<< public
		// Trapezoidation
		this.trapezoider = new PNLTRI.Trapezoider( this.polyData );
		//	=> one triangular trapezoid which lies inside the polygon
		this.trapezoider.trapezoide_polygon();

		// create segments for diagonals
		this.trapezoider.create_visibility_map();
		// create mono chains by inserting diagonals
		this.polyData.create_mono_chains();

		// create UNIQUE monotone sub-polygons
		this.polyData.unique_monotone_chains_max();
	},

};

/**
 * @author jahting / http://www.ameco.tv/
 *
 *	Algorithm to triangulate uni-y-monotone polygons [FoM84]
 *
 *	expects list of doubly linked monoChains, with Y-max as first vertex
 */


/** @constructor */
PNLTRI.MonoTriangulator = function ( inPolygonData ) {

	this.polyData	= inPolygonData;

};


PNLTRI.MonoTriangulator.prototype = {

	constructor: PNLTRI.MonoTriangulator,


	// Pass each uni-y-monotone polygon with start at Y-max for greedy triangulation.

	triangulate_all_polygons: function () {					// <<<<<<<<<< public
		var	normedMonoChains = this.polyData.getMonoSubPolys();
		this.polyData.clearTriangles();
		for ( var i=0; i<normedMonoChains.length; i++ ) {
			// loop through uni-y-monotone chains
			// => monoPosmin is next to monoPosmax (left or right)
			var monoPosmax = normedMonoChains[i];
			var prevMono = monoPosmax.mprev;
			var nextMono = monoPosmax.mnext;

			if ( nextMono.mnext == prevMono ) {		// already a triangle
				this.polyData.addTriangle( monoPosmax.vFrom, nextMono.vFrom, prevMono.vFrom );
			} else {								// triangulate the polygon
				this.triangulate_monotone_polygon( monoPosmax );
			}
		}
	},

	//	algorithm to triangulate an uni-y-monotone polygon in O(n) time.[FoM84]

	triangulate_monotone_polygon: function ( monoPosmax ) {			// private
		var scope = this;

		function error_cleanup() {
			// Error in algorithm OR polygon is not uni-y-monotone
			console.log( "ERR uni-y-monotone: only concave angles left", vertBackLog );
			// push all "wrong" triangles => loop ends
			while (vertBackLogIdx > 1) {
				vertBackLogIdx--;
				scope.polyData.addTriangle(	vertBackLog[vertBackLogIdx-1],
											vertBackLog[vertBackLogIdx],
											vertBackLog[vertBackLogIdx+1] );
			}
		}

		//
		// Decisive for this algorithm to work correctly is to make sure
		//  the polygon stays uni-y-monotone when cutting off ears, i.e.
		//  to make sure the top-most and bottom-most vertices are removed last
		// Usually this is done by handling the LHS-case ("LeftHandSide is a single segment")
		//	and the RHS-case ("RightHandSide segment is a single segment")
		//	differently by starting at the bottom for LHS and at the top for RHS.
		// This is not necessary. It can be seen easily, that starting
		//	from the vertex next to top handles both cases correctly.
		//

		var frontMono = monoPosmax.mnext;		// == LHS: YminPoint; RHS: YmaxPoint.mnext
		var endVert = monoPosmax.vFrom;

		var vertBackLog = [ frontMono.vFrom ];
		var vertBackLogIdx = 0;

		frontMono = frontMono.mnext;
		var frontVert = frontMono.vFrom;

		// check for robustness		// TODO
		if (frontVert == endVert)	return;		// Error: only 2 vertices

		while ( (frontVert != endVert) || (vertBackLogIdx > 1) ) {
			if ( vertBackLogIdx > 0 ) {
				// vertBackLog is not empty
				var insideAngleCCW = PNLTRI.Math.ptsCrossProd( vertBackLog[vertBackLogIdx], frontVert, vertBackLog[vertBackLogIdx-1] );
				if ( Math.abs(insideAngleCCW) <= PNLTRI.Math.EPSILON_P ) {
					// co-linear
					if ( (frontVert == endVert) ||		// all remaining triangles are co-linear (180 degree)
						 ( PNLTRI.Math.compare_pts_yx( vertBackLog[vertBackLogIdx], frontVert ) ==				// co-linear-reversal
						   PNLTRI.Math.compare_pts_yx( vertBackLog[vertBackLogIdx], vertBackLog[vertBackLogIdx-1] ) ) ) {
						insideAngleCCW = 1;		// => create triangle
					}
				}
				if ( insideAngleCCW > 0 ) {
					// convex corner: cut if off
					this.polyData.addTriangle( vertBackLog[vertBackLogIdx-1], vertBackLog[vertBackLogIdx], frontVert );
					vertBackLogIdx--;
				} else {
					// non-convex: add frontVert to the vertBackLog
					vertBackLog[++vertBackLogIdx] = frontVert;
					if (frontVert == endVert)	error_cleanup();	// should never happen !!
					else {
						frontMono = frontMono.mnext;
						frontVert = frontMono.vFrom;
					}
				}
			} else {
				// vertBackLog contains only start vertex:
				//	add frontVert to the vertBackLog and advance frontVert
				vertBackLog[++vertBackLogIdx] = frontVert;
				frontMono = frontMono.mnext;
				frontVert = frontMono.vFrom;
			}
		}
		// reached the last vertex. Add in the triangle formed
		this.polyData.addTriangle( vertBackLog[vertBackLogIdx - 1], vertBackLog[vertBackLogIdx], frontVert );
	},

};

/**
 * @author jahting / http://www.ameco.tv/
 */

/*******************************************************************************
 *
 *	Triangulator for Simple Polygons with Holes
 *
 *  polygon with holes:
 *	- one closed contour polygon chain
 *  - zero or more closed hole polygon chains
 *
 *	polygon chain (closed):
 *	- Array of vertex Objects with attributes "x" and "y"
 *		- representing the sequence of line segments
 *		- closing line segment (last->first vertex) is implied
 *		- line segments are non-zero length and non-crossing
 *
 *	"global vertex index":
 *	- vertex number resulting from concatenation all polygon chains (starts with 0)
 *
 *
 *	Parameters (will not be changed):
 *		inPolygonChains:
 *		- Array of polygon chains
 *
 *	Results (are a fresh copy):
 *		triangulate_polygon:
 *		- Array of Triangles ( Array of 3 "global vertex index" values )
 *
 ******************************************************************************/

/** @constructor */
PNLTRI.Triangulator = function () {

	this.lastPolyData = null;		// for Debug purposes only

};


PNLTRI.Triangulator.prototype = {

	constructor: PNLTRI.Triangulator,


	clear_lastData: function () {	// save memory after Debug
		this.lastPolyData = null;
	},

	// for the polygon data AFTER triangulation
	//	returns an Array of flags, one flag for each polygon chain:
	//		lies the inside of the polygon to the left?
	//		"true" implies CCW for contours and CW for holes
	get_PolyLeftArr: function () {
		if ( this.lastPolyData )	return this.lastPolyData.get_PolyLeftArr();
		return	null;
	},


	triangulate_polygon: function ( inPolygonChains, inForceTrapezoidation ) {

		// collected conditions for selecting EarClipTriangulator over Seidel's algorithm
		function is_basic_polygon() {
			if (inForceTrapezoidation)	return	false;
			return	( myPolygonData.nbPolyChains() == 1 );
		}


		this.clear_lastData();
		if ( ( !inPolygonChains ) || ( inPolygonChains.length === 0 ) )		return	[];
		//
		// initializes general polygon data structure
		//
		var myPolygonData = new PNLTRI.PolygonData( inPolygonChains );
		//
		var basicPolygon = is_basic_polygon();
		var	myTriangulator;
		if ( basicPolygon ) {
			//
			// triangulates single polygon without holes
			//
			myTriangulator = new PNLTRI.EarClipTriangulator( myPolygonData );
			basicPolygon = myTriangulator.triangulate_polygon_no_holes();
		}
		if ( !basicPolygon ) {
			//
			// splits polygon into uni-y-monotone sub-polygons
			//
			var	myMonoSplitter = new PNLTRI.MonoSplitter( myPolygonData );
			myMonoSplitter.monotonate_trapezoids();
			//
			// triangulates all uni-y-monotone sub-polygons
			//
			myTriangulator = new PNLTRI.MonoTriangulator( myPolygonData );
			myTriangulator.triangulate_all_polygons();
		}
		//
		this.lastPolyData = myPolygonData;
		return	myPolygonData.getTriangles();	// copy of triangle list
	}


};
