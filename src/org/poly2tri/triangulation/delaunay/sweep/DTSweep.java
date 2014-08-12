/* Poly2Tri
 * Copyright (c) 2009-2010, Poly2Tri Contributors
 * http://code.google.com/p/poly2tri/
 *
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 * * Neither the name of Poly2Tri nor the names of its contributors may be
 *   used to endorse or promote products derived from this software without specific
 *   prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
package org.poly2tri.triangulation.delaunay.sweep;

import static org.poly2tri.triangulation.TriangulationUtil.EPSILON;
import static org.poly2tri.triangulation.TriangulationUtil.inScanArea;
import static org.poly2tri.triangulation.TriangulationUtil.orient2d;
import static org.poly2tri.triangulation.TriangulationUtil.smartIncircle;

import java.util.List;

import org.poly2tri.triangulation.TriangulationMode;
import org.poly2tri.triangulation.TriangulationPoint;
import org.poly2tri.triangulation.TriangulationUtil.Orientation;
import org.poly2tri.triangulation.delaunay.DelaunayTriangle;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Sweep-line, Constrained Delauney Triangulation (CDT) See: Domiter, V. and
 * Zalik, B.(2008)'Sweep-line algorithm for constrained Delaunay triangulation',
 * International Journal of Geographical Information Science
 * 
 * "FlipScan" Constrained Edge Algorithm invented by author of this code.
 * 
 * Author: Thomas Åhlén, thahlen@gmail.com 
 */

public class DTSweep
{
    private final static Logger logger   = LoggerFactory.getLogger( DTSweep.class );

    private final static double        PI_div2  = Math.PI/2;
    private final static double        PI_3div4 = 3*Math.PI/4;

    public DTSweep()
    {}

    /** Triangulate simple polygon with holes **/
    public static void triangulate( DTSweepContext tcx ) 
    {
        tcx.createAdvancingFront();
        
        sweep( tcx );

        if( tcx.getTriangulationMode() ==  TriangulationMode.POLYGON )
        {
            finalizationPolygon( tcx );
        }
        else
        {
            finalizationConvexHull( tcx );
        }

        tcx.done();
    }

    /**
     * Start sweeping the Y-sorted point set from bottom to top
     * 
     * @param tcx
     */
    private static void sweep( DTSweepContext tcx )
    {
        List<TriangulationPoint> points;
        TriangulationPoint point;
        AdvancingFrontNode node;
        
        points = tcx.getPoints();
        
        for( int i=1; i<points.size(); i++ )
        {
            point = points.get(i);

            node = pointEvent( tcx, point );

            if( point.hasEdges() )
            {
                for( DTSweepConstraint e : point.getEdges() )
                {
                    if( tcx.isDebugEnabled() ) { tcx.getDebugContext().setActiveConstraint( e ); }
                    edgeEvent( tcx, e, node );
                }
            }
            tcx.update( null );
        }
    }

    /**
     * If this is a Delaunay Triangulation of a pointset we need to 
     * fill so the triangle mesh gets a ConvexHull 
     * @param tcx
     */
    private static void finalizationConvexHull( DTSweepContext tcx )
    {
        AdvancingFrontNode n1, n2;
        DelaunayTriangle t1, t2;
        TriangulationPoint first, p1;

        n1 = tcx.aFront.head.next;
        n2 = n1.next;
        first = n1.point;

        turnAdvancingFrontConvex( tcx, n1, n2 );
        
        // TODO: implement ConvexHull for lower right and left boundary
        
        // Lets remove triangles connected to the two "algorithm" points

        // XXX: When the first the nodes are points in a triangle we need to do a flip before 
        //      removing triangles or we will lose a valid triangle.
        //      Same for last three nodes!
        // !!! If I implement ConvexHull for lower right and left boundary this fix should not be 
        //     needed and the removed triangles will be added again by default
        n1 = tcx.aFront.tail.prev;
        if( n1.triangle.contains( n1.next.point ) && n1.triangle.contains( n1.prev.point ) )
        {
            t1 = n1.triangle.neighborAcross( n1.point );
            rotateTrianglePair( n1.triangle, n1.point, t1, t1.oppositePoint( n1.triangle, n1.point ) );
            tcx.mapTriangleToNodes( n1.triangle );
            tcx.mapTriangleToNodes( t1 );
        }                
        n1 = tcx.aFront.head.next;
        if( n1.triangle.contains( n1.prev.point ) && n1.triangle.contains( n1.next.point ) )
        {
            t1 = n1.triangle.neighborAcross( n1.point );
            rotateTrianglePair( n1.triangle, n1.point, t1, t1.oppositePoint( n1.triangle, n1.point ) );
            tcx.mapTriangleToNodes( n1.triangle );
            tcx.mapTriangleToNodes( t1 );
        }                

        // Lower right boundary 
        first = tcx.aFront.head.point;
        n2 = tcx.aFront.tail.prev;
        t1 = n2.triangle;
        p1 = n2.point;
        n2.triangle = null;
        do
        {
            tcx.removeFromList( t1 );
            p1 = t1.pointCCW( p1 );
            if( p1 == first ) break;
            t2 = t1.neighborCCW( p1 );
            t1.clear();
            t1 = t2;
        } while( true );
        
        // Lower left boundary
        first = tcx.aFront.head.next.point;
        p1 = t1.pointCW( tcx.aFront.head.point );
        t2 = t1.neighborCW( tcx.aFront.head.point );
        t1.clear();
        t1 = t2;
        while( p1 != first )
        {
            tcx.removeFromList( t1 );
            p1 = t1.pointCCW( p1 );
            t2 = t1.neighborCCW( p1 );
            t1.clear();
            t1 = t2;
        }    
        
        // Remove current head and tail node now that we have removed all triangles attached
        // to them. Then set new head and tail node points
        tcx.aFront.head = tcx.aFront.head.next;
        tcx.aFront.head.prev = null;
        tcx.aFront.tail = tcx.aFront.tail.prev;
        tcx.aFront.tail.next = null;
        
        tcx.finalizeTriangulation();
    }

    /**
     * We will traverse the entire advancing front and fill it to form a
     * convex hull.<br>
     */
    private static void turnAdvancingFrontConvex( DTSweepContext tcx, 
                                                  AdvancingFrontNode b, 
                                                  AdvancingFrontNode c )
    {
        AdvancingFrontNode first = b;
        while( c != tcx.aFront.tail )
        {
            if( tcx.isDebugEnabled() ) { tcx.getDebugContext().setActiveNode( c ); }

            if( orient2d( b.point, c.point, c.next.point ) == Orientation.CCW )
            {
                // [b,c,d] Concave - fill around c
                fill( tcx, c );
                c = c.next;
            }
            else
            {
                // [b,c,d] Convex
                if( b != first && orient2d( b.prev.point, b.point, c.point ) == Orientation.CCW )
                {
                    // [a,b,c] Concave - fill around b
                    fill( tcx, b );
                    b = b.prev;
                }
                else
                {
                    // [a,b,c] Convex - nothing to fill
                    b = c;
                    c = c.next;
                }
            }            
        }
    }
    
    private static void finalizationPolygon( DTSweepContext tcx )
    {
        // Get an Internal triangle to start with
        DelaunayTriangle t = tcx.aFront.head.next.triangle;
        TriangulationPoint p = tcx.aFront.head.next.point;
        while( !t.getConstrainedEdgeCW( p ) )
        {
            t = t.neighborCCW( p );
        }
        
        // Collect interior triangles constrained by edges
        tcx.meshClean( t );
    }

    /**
     * Find closes node to the left of the new point and
     * create a new triangle. If needed new holes and basins
     * will be filled to.
     * 
     * @param tcx
     * @param point
     * @return
     */
    private static AdvancingFrontNode pointEvent( DTSweepContext tcx, 
                                                  TriangulationPoint point )
    {
        AdvancingFrontNode node,newNode;

        node = tcx.locateNode( point );
        if( tcx.isDebugEnabled() ) { tcx.getDebugContext().setActiveNode( node ); }
        newNode = newFrontTriangle( tcx, point, node );

        // Only need to check +epsilon since point never have smaller 
        // x value than node due to how we fetch nodes from the front
        if( point.getX() <= node.point.getX() + EPSILON )
        {
            fill( tcx, node );
        }
        tcx.addNode( newNode );
          
        fillAdvancingFront( tcx, newNode );
        return newNode;
    }

    /**
     * Creates a new front triangle and legalize it
     * 
     * @param tcx
     * @param point
     * @param node
     * @return
     */
    private static AdvancingFrontNode newFrontTriangle( DTSweepContext tcx, 
                                                        TriangulationPoint point, 
                                                        AdvancingFrontNode node )    
    {
        AdvancingFrontNode newNode;
        DelaunayTriangle triangle;
    
        triangle = new DelaunayTriangle( point, node.point, node.next.point );
        triangle.markNeighbor( node.triangle );
        tcx.addToList( triangle );          

        newNode = new AdvancingFrontNode( point );
        newNode.next = node.next;
        newNode.prev = node;
        node.next.prev = newNode;
        node.next = newNode;  
        
        tcx.addNode( newNode ); // XXX: BST
        
        if( tcx.isDebugEnabled() ) { tcx.getDebugContext().setActiveNode( newNode ); }
        
        if( !legalize( tcx, triangle ) )
        {
            tcx.mapTriangleToNodes( triangle );
        }

        return newNode;
    }

    /**
     * 
     * 
     * @param tcx
     * @param edge
     * @param node
     */
    private static void edgeEvent( DTSweepContext     tcx, 
                                   DTSweepConstraint  edge, 
                                   AdvancingFrontNode node )
    {
        try
        {
            tcx.edgeEvent.constrainedEdge = edge;
            tcx.edgeEvent.right = edge.p.getX() > edge.q.getX();
            
            if( tcx.isDebugEnabled() ) { tcx.getDebugContext().setPrimaryTriangle( node.triangle ); }

            if( isEdgeSideOfTriangle( node.triangle, edge.p, edge.q ) )
            {
                return;
            }

            // For now we will do all needed filling
            // TODO: integrate with flip process might give some better performance 
            //       but for now this avoid the issue with cases that needs both flips and fills
            fillEdgeEvent( tcx, edge, node );

            edgeEvent( tcx, edge.p, edge.q , node.triangle, edge.q );            
        }
        catch( PointOnEdgeException e )
        {
            logger.warn( "Skipping edge: {}", e.getMessage() );
        }
    }
    
    private static void fillEdgeEvent( DTSweepContext tcx, DTSweepConstraint edge, AdvancingFrontNode node )
    {
        if( tcx.edgeEvent.right )
        {
            fillRightAboveEdgeEvent( tcx, edge, node );
        }
        else
        {
            fillLeftAboveEdgeEvent( tcx, edge, node );                
        }      
    }
    
    private static void fillRightConcaveEdgeEvent( DTSweepContext tcx, DTSweepConstraint edge, AdvancingFrontNode node )
    {
        fill( tcx, node.next );
        if( node.next.point != edge.p )
        {
            // Next above or below edge?
            if( orient2d( edge.q, node.next.point, edge.p ) == Orientation.CCW )
            {
                // Below
                if( orient2d( node.point, node.next.point, node.next.next.point ) == Orientation.CCW )
                {
                    // Next is concave
                    fillRightConcaveEdgeEvent( tcx, edge, node );
                }
                else
                {
                    // Next is convex
                }
            }
        }
    }

    private static void fillRightConvexEdgeEvent( DTSweepContext tcx, DTSweepConstraint edge, AdvancingFrontNode node )
    {
        // Next concave or convex?
        if( orient2d( node.next.point, node.next.next.point, node.next.next.next.point ) == Orientation.CCW )
        {
            // Concave
            fillRightConcaveEdgeEvent( tcx, edge, node.next );
        }
        else
        {
            // Convex
            // Next above or below edge?
            if( orient2d( edge.q, node.next.next.point, edge.p ) == Orientation.CCW )
            {
                // Below
                fillRightConvexEdgeEvent( tcx, edge, node.next );
            }
            else
            {
                // Above
            }
        }
    }

    private static void fillRightBelowEdgeEvent(  DTSweepContext tcx, DTSweepConstraint edge, AdvancingFrontNode node )
    {
        if( tcx.isDebugEnabled() ) { tcx.getDebugContext().setActiveNode( node ); }
        if( node.point.getX() < edge.p.getX() ) // needed?
        {
            if( orient2d( node.point, node.next.point, node.next.next.point ) == Orientation.CCW )
            {
                // Concave 
                fillRightConcaveEdgeEvent( tcx, edge, node );
            }
            else
            {
                // Convex
                fillRightConvexEdgeEvent( tcx, edge, node );
                // Retry this one
                fillRightBelowEdgeEvent( tcx, edge, node );
            }

        }         
    }

    private static void fillRightAboveEdgeEvent(  DTSweepContext tcx, DTSweepConstraint edge, AdvancingFrontNode node )
    {
        while( node.next.point.getX() < edge.p.getX() )
        {
            if( tcx.isDebugEnabled() ) { tcx.getDebugContext().setActiveNode( node ); }
            // Check if next node is below the edge
            Orientation o1 = orient2d( edge.q, node.next.point, edge.p ); 
            if( o1 == Orientation.CCW )
            {
                fillRightBelowEdgeEvent( tcx, edge, node );                        
            }
            else
            {
                node = node.next;
            }            
        }         
    }

    private static void fillLeftConvexEdgeEvent( DTSweepContext tcx, DTSweepConstraint edge, AdvancingFrontNode node )
    {
        // Next concave or convex?
        if( orient2d( node.prev.point, node.prev.prev.point, node.prev.prev.prev.point ) == Orientation.CW )
        {
            // Concave
            fillLeftConcaveEdgeEvent( tcx, edge, node.prev );
        }
        else
        {
            // Convex
            // Next above or below edge?
            if( orient2d( edge.q, node.prev.prev.point, edge.p ) == Orientation.CW )
            {
                // Below
                fillLeftConvexEdgeEvent( tcx, edge, node.prev );
            }
            else
            {
                // Above
            }
        }
    }
    
    private static void fillLeftConcaveEdgeEvent( DTSweepContext tcx, DTSweepConstraint edge, AdvancingFrontNode node )
    {
        fill( tcx, node.prev );
        if( node.prev.point != edge.p )
        {
            // Next above or below edge?
            if( orient2d( edge.q, node.prev.point, edge.p ) == Orientation.CW )
            {
                // Below
                if( orient2d( node.point, node.prev.point, node.prev.prev.point ) == Orientation.CW )
                {
                    // Next is concave
                    fillLeftConcaveEdgeEvent( tcx, edge, node );
                }
                else
                {
                    // Next is convex
                }
            }
        }
    }

    private static void fillLeftBelowEdgeEvent(  DTSweepContext tcx, DTSweepConstraint edge, AdvancingFrontNode node )
    {
        if( tcx.isDebugEnabled() ) { tcx.getDebugContext().setActiveNode( node ); }
        if( node.point.getX() > edge.p.getX() )
        {
            if( orient2d( node.point, node.prev.point, node.prev.prev.point ) == Orientation.CW )
            {
                // Concave 
                fillLeftConcaveEdgeEvent( tcx, edge, node );
            }
            else
            {
                // Convex
                fillLeftConvexEdgeEvent( tcx, edge, node );
                // Retry this one
                fillLeftBelowEdgeEvent( tcx, edge, node );
            }

        }         
    }
    
    private static void fillLeftAboveEdgeEvent(  DTSweepContext tcx, DTSweepConstraint edge, AdvancingFrontNode node )
    {
        while( node.prev.point.getX() > edge.p.getX() )
        {
            if( tcx.isDebugEnabled() ) { tcx.getDebugContext().setActiveNode( node ); }
            // Check if next node is below the edge
            Orientation o1 = orient2d( edge.q, node.prev.point, edge.p ); 
            if( o1 == Orientation.CW )
            {
                fillLeftBelowEdgeEvent( tcx, edge, node );                        
            }
            else
            {
                node = node.prev;
            }            
        }         
    }

    private static boolean isEdgeSideOfTriangle( DelaunayTriangle triangle,
                                                 TriangulationPoint ep,
                                                 TriangulationPoint eq )
    {
        int index;
        index = triangle.edgeIndex( ep, eq );
        if( index != -1 )
        {
            triangle.markConstrainedEdge( index );
            triangle = triangle.neighbors[ index ];
            if( triangle != null )
            {
                triangle.markConstrainedEdge( ep, eq );
            }
            return true;
        }        
        return false;
    }
    
    private static void edgeEvent( DTSweepContext tcx, 
                                   TriangulationPoint ep,
                                   TriangulationPoint eq,
                                   DelaunayTriangle triangle, 
                                   TriangulationPoint point )
    {
        TriangulationPoint p1,p2;
                
        if( tcx.isDebugEnabled() ) { tcx.getDebugContext().setPrimaryTriangle( triangle ); }

        if( isEdgeSideOfTriangle( triangle, ep, eq ) )
        {
            return;
        }
        
        p1 = triangle.pointCCW( point );
        Orientation o1 = orient2d( eq, p1, ep );
        if( o1 == Orientation.Collinear )
        {
            if( triangle.contains( eq, p1 ) )
            {
                triangle.markConstrainedEdge( eq, p1 );
                // We are modifying the constraint maybe it would be better to 
                // not change the given constraint and just keep a variable for the new constraint
                tcx.edgeEvent.constrainedEdge.q = p1;
                triangle = triangle.neighborAcross( point );
                edgeEvent( tcx, ep, p1, triangle, p1 );
            }
            else
            {
                throw new PointOnEdgeException( "EdgeEvent - Point on constrained edge not supported yet" );                
            }            
            if( tcx.isDebugEnabled() ) { logger.info( "EdgeEvent - Point on constrained edge" ); }
            return;
        }

        p2 = triangle.pointCW( point );
        Orientation o2 = orient2d( eq, p2, ep );
        if( o2 == Orientation.Collinear )
        {
            if( triangle.contains( eq, p2 ) )
            {
                triangle.markConstrainedEdge( eq, p2 );
                // We are modifying the constraint maybe it would be better to 
                // not change the given constraint and just keep a variable for the new constraint
                tcx.edgeEvent.constrainedEdge.q = p2;
                triangle = triangle.neighborAcross( point );
                edgeEvent( tcx, ep, p2, triangle, p2 );
            }
            else
            {
                throw new PointOnEdgeException( "EdgeEvent - Point on constrained edge not supported yet" );                
            }            
            if( tcx.isDebugEnabled() ) { logger.info( "EdgeEvent - Point on constrained edge" ); }
            return;
        }

        if( o1 == o2 )
        {
            // Need to decide if we are rotating CW or CCW to get to a triangle
            // that will cross edge
            if( o1 == Orientation.CW )
            {
                triangle = triangle.neighborCCW( point );
            }
            else
            {
                triangle = triangle.neighborCW( point );                
            }
            edgeEvent( tcx, ep, eq, triangle, point );
        }
        else
        {
            // This triangle crosses constraint so lets flippin start!
            flipEdgeEvent( tcx, ep, eq, triangle, point );
        }        
    }

    private static void flipEdgeEvent( DTSweepContext tcx, 
                                       TriangulationPoint ep,
                                       TriangulationPoint eq,
                                       DelaunayTriangle t, 
                                       TriangulationPoint p )
    {
        TriangulationPoint op, newP;
        DelaunayTriangle ot;
        boolean inScanArea;
        
        ot = t.neighborAcross( p );
        op = ot.oppositePoint( t, p );

        if( ot == null )
        {
            // If we want to integrate the fillEdgeEvent do it here
            // With current implementation we should never get here
            throw new RuntimeException( "[BUG:FIXME] FLIP failed due to missing triangle");
        }

        if( t.getConstrainedEdgeAcross(p) )
        {
            throw new RuntimeException( "Intersecting Constraints" );
        }

        if( tcx.isDebugEnabled() ) 
        { 
            tcx.getDebugContext().setPrimaryTriangle( t ); 
            tcx.getDebugContext().setSecondaryTriangle( ot ); 
         } // TODO: remove

        inScanArea = inScanArea( p,
                                 t.pointCCW( p ),
                                 t.pointCW( p ), 
                                 op );
        if( inScanArea )
        {
            // Lets rotate shared edge one vertex CW
            rotateTrianglePair( t, p, ot, op );
            tcx.mapTriangleToNodes( t );
            tcx.mapTriangleToNodes( ot );
            
            if( p == eq && op == ep )
            {
                if(    eq == tcx.edgeEvent.constrainedEdge.q 
                    && ep == tcx.edgeEvent.constrainedEdge.p)
                {
                    if( tcx.isDebugEnabled() ) { System.out.println("[FLIP] - constrained edge done" ); } // TODO: remove                    
                    t.markConstrainedEdge( ep, eq );
                    ot.markConstrainedEdge( ep, eq );
                    legalize( tcx, t );                    
                    legalize( tcx, ot );  
                }
                else
                {
                    if( tcx.isDebugEnabled() ) { System.out.println("[FLIP] - subedge done" ); } // TODO: remove
                    // XXX: I think one of the triangles should be legalized here?                    
                }
            }                          
            else
            {
                if( tcx.isDebugEnabled() ) { System.out.println("[FLIP] - flipping and continuing with triangle still crossing edge" ); } // TODO: remove
                Orientation o = orient2d( eq, op, ep );
                t = nextFlipTriangle( tcx, o, t, ot, p, op );
                flipEdgeEvent( tcx, ep, eq, t, p );
            }
        }
        else
        {
            newP = nextFlipPoint( ep, eq, ot, op );
            flipScanEdgeEvent( tcx, ep, eq, t, ot, newP );
            edgeEvent( tcx, ep, eq, t, p );                
        }
    }

    /**
     * When we need to traverse from one triangle to the next we need 
     * the point in current triangle that is the opposite point to the next
     * triangle. 
     * 
     * @param ep
     * @param eq
     * @param ot
     * @param op
     * @return
     */
    private static TriangulationPoint nextFlipPoint( TriangulationPoint ep,
                                                     TriangulationPoint eq,
                                                     DelaunayTriangle ot, 
                                                     TriangulationPoint op )
    {
        Orientation o2d = orient2d( eq, op, ep );
        if( o2d == Orientation.CW )
        {
            // Right
            return ot.pointCCW( op );
        }
        else if( o2d == Orientation.CCW )
        {
            // Left                
            return ot.pointCW( op );
        }
        else
        {
            // TODO: implement support for point on constraint edge
            throw new PointOnEdgeException("Point on constrained edge not supported yet");
        }                    
    }
    
    /**
     * After a flip we have two triangles and know that only one will still be
     * intersecting the edge. So decide which to contiune with and legalize the other
     * 
     * @param tcx
     * @param o - should be the result of an orient2d( eq, op, ep )
     * @param t - triangle 1
     * @param ot - triangle 2
     * @param p - a point shared by both triangles 
     * @param op - another point shared by both triangles
     * @return returns the triangle still intersecting the edge
     */
    private static DelaunayTriangle nextFlipTriangle( DTSweepContext tcx, 
                                               Orientation o,
                                               DelaunayTriangle  t, 
                                               DelaunayTriangle ot, 
                                               TriangulationPoint p, 
                                               TriangulationPoint op)
    {
        int edgeIndex;
        if( o == Orientation.CCW )
        {
            // ot is not crossing edge after flip
            edgeIndex = ot.edgeIndex( p, op );
            ot.dEdge[edgeIndex] = true;
            legalize( tcx, ot );
            ot.clearDelunayEdges();
            return t;
        }
        // t is not crossing edge after flip
        edgeIndex = t.edgeIndex( p, op );
        t.dEdge[edgeIndex] = true;
        legalize( tcx, t );
        t.clearDelunayEdges();            
        return ot;
    }
    
    /**
     * Scan part of the FlipScan algorithm<br>
     * When a triangle pair isn't flippable we will scan for the next 
     * point that is inside the flip triangle scan area. When found 
     * we generate a new flipEdgeEvent
     * 
     * @param tcx
     * @param ep - last point on the edge we are traversing
     * @param eq - first point on the edge we are traversing
     * @param flipTriangle - the current triangle sharing the point eq with edge
     * @param t
     * @param p
     */
    private static void flipScanEdgeEvent( DTSweepContext tcx, 
                                           TriangulationPoint ep,
                                           TriangulationPoint eq,
                                           DelaunayTriangle flipTriangle, 
                                           DelaunayTriangle t, 
                                           TriangulationPoint p )
    {
        DelaunayTriangle ot;
        TriangulationPoint op,newP;
        boolean inScanArea;
                
        ot = t.neighborAcross( p );
        op = ot.oppositePoint( t, p );        
        
        if( ot == null )
        {
            // If we want to integrate the fillEdgeEvent do it here
            // With current implementation we should never get here
            throw new RuntimeException( "[BUG:FIXME] FLIP failed due to missing triangle");
        }

        if( tcx.isDebugEnabled() ) 
        { 
            System.out.println("[FLIP:SCAN] - scan next point" ); // TODO: remove
            tcx.getDebugContext().setPrimaryTriangle( t );        
            tcx.getDebugContext().setSecondaryTriangle( ot ); 
        }
        
        inScanArea = inScanArea( eq,
                                 flipTriangle.pointCCW( eq ),
                                 flipTriangle.pointCW( eq ), 
                                 op );
        if( inScanArea )
        {
            // flip with new edge op->eq
            flipEdgeEvent( tcx, eq, op, ot, op );                
            // TODO: Actually I just figured out that it should be possible to 
            //       improve this by getting the next ot and op before the the above 
            //       flip and continue the flipScanEdgeEvent here
            // set new ot and op here and loop back to inScanArea test
            // also need to set a new flipTriangle first
            // Turns out at first glance that this is somewhat complicated
            // so it will have to wait.
        }
        else
        {
            newP = nextFlipPoint( ep, eq, ot, op );
            flipScanEdgeEvent( tcx, ep, eq, flipTriangle, ot, newP );    
        }
    }

    /**
     * Fills holes in the Advancing Front 
     * 
     * 
     * @param tcx
     * @param n
     */
    private static void fillAdvancingFront( DTSweepContext tcx, AdvancingFrontNode n )
    {
        AdvancingFrontNode node;
        double angle;
        
        // Fill right holes
        node = n.next;
        while( node.hasNext() )
        {
            if( isLargeHole(node) )
            {
                break;
            }
            fill( tcx, node );                    
            node = node.next;
        }

        // Fill left holes
        node = n.prev;
        while( node.hasPrevious() )
        {
            if( isLargeHole(node) )
            {
                break;
            }
            fill( tcx, node );
            node = node.prev;
        }

        // Fill right basins
        if( n.hasNext() && n.next.hasNext() )
        {
            angle = basinAngle( n );
            if( angle < PI_3div4 )
            {
                fillBasin( tcx, n );
            }
        }
    }

    /**
     * @param node
     * @return true if hole angle exceeds 90 degrees
     */
    private static boolean isLargeHole(AdvancingFrontNode node)
    {
        double angle = angle(node.point, node.next.point, node.prev.point);
        //XXX: don't see angle being in range [-pi/2,0] due to how advancing front works
//        return (angle > PI_div2) || (angle < -PI_div2); 
        return (angle > PI_div2) || (angle < 0); 
    	
        // ISSUE 48: http://code.google.com/p/poly2tri/issues/detail?id=48
        // TODO: Adding this fix suggested in issues 48 caused some 
        //       triangulations to fail so commented it out for now.
        //
        // Also haven't been able to produce a triangulation that gives the
        // problem described in issue 48.
        
//        AdvancingFrontNode nextNode = node.next;
//        AdvancingFrontNode prevNode = node.prev;
//        if( !AngleExceeds90Degrees(node.point, 
//                                   nextNode.point, 
//                                   prevNode.point))
//        {
//            return false;
//        }
//
//        // Check additional points on front.
//        AdvancingFrontNode next2Node = nextNode.next;
//        // "..Plus.." because only want angles on same side as point being added.
//        if(    (next2Node != null) 
//            && !AngleExceedsPlus90DegreesOrIsNegative(node.point, 
//                                                      next2Node.point, 
//                                                      prevNode.point))
//        {
//            return false;
//        }
//
//        AdvancingFrontNode prev2Node = prevNode.prev;
//        // "..Plus.." because only want angles on same side as point being added.
//        if(    (prev2Node != null) 
//            && !AngleExceedsPlus90DegreesOrIsNegative(node.point, 
//                                                      nextNode.point, 
//                                                      prev2Node.point))
//        {
//            return false;
//        }
//        return true;
    }
    
//    private static boolean AngleExceeds90Degrees
//    (
//        TriangulationPoint origin, 
//        TriangulationPoint pa, 
//        TriangulationPoint pb
//    )
//    {
//        double angle = angle(origin, pa, pb);
//        return (angle > PI_div2) || (angle < -PI_div2);
//    }
//
//
//    private static boolean AngleExceedsPlus90DegreesOrIsNegative
//    (
//        TriangulationPoint origin, 
//        TriangulationPoint pa, 
//        TriangulationPoint pb
//    )
//    {
//        double angle = angle(origin, pa, pb);
//        return (angle > PI_div2) || (angle < 0);
//    }
    
    /**
     * Fills a basin that has formed on the Advancing Front to the right
     * of given node.<br>
     * First we decide a left,bottom and right node that forms the 
     * boundaries of the basin. Then we do a reqursive fill.
     * 
     * @param tcx
     * @param node - starting node, this or next node will be left node
     */
    private static void fillBasin( DTSweepContext tcx, AdvancingFrontNode node )
    {
        if( orient2d( node.point, node.next.point, node.next.next.point ) == Orientation.CCW )
        {
            tcx.basin.leftNode = node;
        }
        else
        {
            tcx.basin.leftNode = node.next;
        }
        
        // Find the bottom and right node
        tcx.basin.bottomNode = tcx.basin.leftNode;
        while(   tcx.basin.bottomNode.hasNext() 
              && tcx.basin.bottomNode.point.getY() >= tcx.basin.bottomNode.next.point.getY() )
        {
            tcx.basin.bottomNode = tcx.basin.bottomNode.next;
        }
        if( tcx.basin.bottomNode == tcx.basin.leftNode )
        {
            // No valid basin
            return;
        }
        
        tcx.basin.rightNode = tcx.basin.bottomNode;
        while(   tcx.basin.rightNode.hasNext() 
              && tcx.basin.rightNode.point.getY() < tcx.basin.rightNode.next.point.getY() )
        {
            tcx.basin.rightNode = tcx.basin.rightNode.next;
        }        
        if( tcx.basin.rightNode == tcx.basin.bottomNode )
        {
            // No valid basins
            return;
        }
        
        tcx.basin.width = tcx.basin.rightNode.getPoint().getX() - tcx.basin.leftNode.getPoint().getX();
        tcx.basin.leftHighest = tcx.basin.leftNode.getPoint().getY() > tcx.basin.rightNode.getPoint().getY();
        
        fillBasinReq( tcx, tcx.basin.bottomNode );        
    }
    
    /**
     * Recursive algorithm to fill a Basin with triangles
     * 
     * @param tcx
     * @param node - bottomNode
     * @param cnt - counter used to alternate on even and odd numbers
     */
    private static void fillBasinReq( DTSweepContext tcx, AdvancingFrontNode node )
    {
        // if shallow stop filling
        if( isShallow( tcx, node) ) 
        {            
            return;
        }
        
        fill( tcx, node );
        if( node.prev == tcx.basin.leftNode && node.next == tcx.basin.rightNode )
        {
            return;
        }
        else if( node.prev == tcx.basin.leftNode )
        {
            Orientation o = orient2d( node.point, node.next.point, node.next.next.point );
            if( o == Orientation.CW )
            {
                return;
            }
            node = node.next;
        }
        else if( node.next == tcx.basin.rightNode )
        {
            Orientation o = orient2d( node.point, node.prev.point, node.prev.prev.point );
            if( o == Orientation.CCW )
            {
                return;
            }
            node = node.prev;
        }
        else
        {
            // Continue with the neighbor node with lowest Y value
            if( node.prev.point.getY() < node.next.point.getY() )
            {
                node = node.prev;
            }
            else
            {
                node = node.next;
            }
        }        
        fillBasinReq( tcx, node );
    }
    
    private static boolean isShallow( DTSweepContext tcx, AdvancingFrontNode node )
    {
        double height;

        if( tcx.basin.leftHighest )
        {
            height = tcx.basin.leftNode.getPoint().getY() - node.getPoint().getY();
        }
        else
        {
            height = tcx.basin.rightNode.getPoint().getY() - node.getPoint().getY();            
        }
        if( tcx.basin.width > height ) 
        {
            return true;
        }        
        return false;
    }
    
    /**
     * 
     * @param node - middle node
     * @return the angle between p-a and p-b in range [-pi,pi]
     */
    private static double angle( TriangulationPoint p, 
    		                     TriangulationPoint a, 
    		                     TriangulationPoint b )
    {
        // XXX: do we really need a signed angle for holeAngle?
        //      could possible save some cycles here
        /* Complex plane
         * ab = cosA +i*sinA
         * ab = (ax + ay*i)(bx + by*i) = (ax*bx + ay*by) + i(ax*by-ay*bx)
         * atan2(y,x) computes the principal value of the argument function
         * applied to the complex number x+iy
         * Where x = ax*bx + ay*by
         *       y = ax*by - ay*bx
         */
        final double px = p.getX();
        final double py = p.getY();
        final double ax = a.getX() - px;
        final double ay = a.getY() - py;
        final double bx = b.getX() - px;
        final double by = b.getY() - py;
        return Math.atan2( ax*by - ay*bx, ax*bx + ay*by );
    }

    /**
     * The basin angle is decided against the horizontal line [1,0]
     */
    private static double basinAngle( AdvancingFrontNode node )
    {
        double ax = node.point.getX() - node.next.next.point.getX();
        double ay = node.point.getY() - node.next.next.point.getY();
        return Math.atan2( ay, ax );
    }

    /**
     * Adds a triangle to the advancing front to fill a hole.
     * @param tcx
     * @param node - middle node, that is the bottom of the hole
     */
    private static void fill( DTSweepContext tcx, AdvancingFrontNode node )
    {
        DelaunayTriangle triangle = new DelaunayTriangle( node.prev.point, 
                                                          node.point, 
                                                          node.next.point );
        // TODO: should copy the cEdge value from neighbor triangles
        //       for now cEdge values are copied during the legalize 
        triangle.markNeighbor( node.prev.triangle );
        triangle.markNeighbor( node.triangle );
        tcx.addToList( triangle );

        // Update the advancing front
        node.prev.next = node.next;
        node.next.prev = node.prev;
        tcx.removeNode( node );
        
        // If it was legalized the triangle has already been mapped
        if( !legalize( tcx, triangle ) )
        {
            tcx.mapTriangleToNodes( triangle );
        }
    }
    
    /**
     * Returns true if triangle was legalized
     */
    private static boolean legalize( DTSweepContext tcx, 
                                     DelaunayTriangle t )
    {
        int oi;
        boolean inside;
        TriangulationPoint p,op;
        DelaunayTriangle ot;
        // To legalize a triangle we start by finding if any of the three edges
        // violate the Delaunay condition
        for( int i=0; i<3; i++ )
        {
            // TODO: fix so that cEdge is always valid when creating new triangles then we can check it here
            //       instead of below with ot
            if( t.dEdge[i] )
            {
                continue;
            }
            ot = t.neighbors[i];
            if( ot != null )
            {
                p = t.points[i];
                op = ot.oppositePoint( t, p );
                oi = ot.index( op );
                // If this is a Constrained Edge or a Delaunay Edge(only during recursive legalization)
                // then we should not try to legalize
                if( ot.cEdge[oi] || ot.dEdge[oi] )
                {
                    t.cEdge[i] = ot.cEdge[oi]; // XXX: have no good way of setting this property when creating new triangles so lets set it here                     
                    continue;
                }
                inside = smartIncircle( p, 
                                        t.pointCCW( p ),
                                        t.pointCW( p ), 
                                        op );
                if( inside )
                {
                    boolean notLegalized;
                    
                    // Lets mark this shared edge as Delaunay 
                    t.dEdge[i] = true;
                    ot.dEdge[oi] = true;

                    // Lets rotate shared edge one vertex CW to legalize it
                    rotateTrianglePair( t, p, ot, op );

                    // We now got one valid Delaunay Edge shared by two triangles
                    // This gives us 4 new edges to check for Delaunay

                    // Make sure that triangle to node mapping is done only one time for a specific triangle
                    notLegalized = !legalize( tcx, t );
                    if( notLegalized )
                    {
                        tcx.mapTriangleToNodes( t );                        
                    }
                    notLegalized = !legalize( tcx, ot );
                    if( notLegalized )
                    {
                        tcx.mapTriangleToNodes( ot );                        
                    }
                                        
                    // Reset the Delaunay edges, since they only are valid Delaunay edges
                    // until we add a new triangle or point.
                    // XXX: need to think about this. Can these edges be tried after we 
                    //      return to previous recursive level?
                    t.dEdge[i] = false;
                    ot.dEdge[oi] = false;

                    // If triangle have been legalized no need to check the other edges since
                    // the recursive legalization will handles those so we can end here.
                    return true;
                }
            }
        }   
        return false;
    }    
    
    /**
     * Rotates a triangle pair one vertex CW
     *<pre>
     *       n2                    n2
     *  P +-----+             P +-----+
     *    | t  /|               |\  t |  
     *    |   / |               | \   |
     *  n1|  /  |n3           n1|  \  |n3
     *    | /   |    after CW   |   \ |
     *    |/ oT |               | oT \|
     *    +-----+ oP            +-----+
     *       n4                    n4
     * </pre>
     */
    private static void rotateTrianglePair( DelaunayTriangle t, 
                                            TriangulationPoint p, 
                                            DelaunayTriangle ot, 
                                            TriangulationPoint op )
    {
        DelaunayTriangle n1,n2,n3,n4;
        n1 = t.neighborCCW( p );
        n2 = t.neighborCW( p );
        n3 = ot.neighborCCW( op );
        n4 = ot.neighborCW( op );

        boolean ce1,ce2,ce3,ce4;
        ce1 = t.getConstrainedEdgeCCW(p);
        ce2 = t.getConstrainedEdgeCW(p);
        ce3 = ot.getConstrainedEdgeCCW(op);
        ce4 = ot.getConstrainedEdgeCW(op);
        
        boolean de1,de2,de3,de4;
        de1 = t.getDelunayEdgeCCW(p);
        de2 = t.getDelunayEdgeCW(p);
        de3 = ot.getDelunayEdgeCCW(op);
        de4 = ot.getDelunayEdgeCW(op);
        
        t.legalize( p, op );
        ot.legalize( op, p );
        
        // Remap dEdge
        ot.setDelunayEdgeCCW( p, de1 );
        t.setDelunayEdgeCW(   p, de2 );
        t.setDelunayEdgeCCW( op, de3 );
        ot.setDelunayEdgeCW( op, de4 );

        // Remap cEdge
        ot.setConstrainedEdgeCCW( p, ce1 );
        t.setConstrainedEdgeCW(   p, ce2 );
        t.setConstrainedEdgeCCW( op, ce3 );
        ot.setConstrainedEdgeCW( op, ce4 );
        
        // Remap neighbors
        // XXX: might optimize the markNeighbor by keeping track of
        //      what side should be assigned to what neighbor after the 
        //      rotation. Now mark neighbor does lots of testing to find 
        //      the right side.
        t.clearNeighbors();
        ot.clearNeighbors();
        if( n1 != null ) ot.markNeighbor( n1 );
        if( n2 != null ) t.markNeighbor( n2 );
        if( n3 != null ) t.markNeighbor( n3 );
        if( n4 != null ) ot.markNeighbor( n4 );
        t.markNeighbor( ot );
    }    
}
