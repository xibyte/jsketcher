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
package org.poly2tri.triangulation.delaunay;

import java.util.ArrayList;

import org.poly2tri.triangulation.TriangulationPoint;
import org.poly2tri.triangulation.delaunay.sweep.DTSweepConstraint;
import org.poly2tri.triangulation.point.TPoint;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


public class DelaunayTriangle
{
    private final static Logger logger    = LoggerFactory.getLogger( DelaunayTriangle.class );

    /** Neighbor pointers */
    public final DelaunayTriangle[]   neighbors = new DelaunayTriangle[3];
    /** Flags to determine if an edge is a Constrained edge */
    public final boolean[]            cEdge     = new boolean[] { false, false, false };
    /** Flags to determine if an edge is a Delauney edge */
    public final boolean[]            dEdge     = new boolean[] { false, false, false };
    /** Has this triangle been marked as an interior triangle? */
    protected boolean           interior  = false;

    public final TriangulationPoint[] points = new TriangulationPoint[3];

    public DelaunayTriangle( TriangulationPoint p1, TriangulationPoint p2, TriangulationPoint p3 )
    {
        points[0] = p1;
        points[1] = p2;
        points[2] = p3;
    }

    public int index( TriangulationPoint p )
    {
        if( p == points[0] )
        {
            return 0;
        }
        else if( p == points[1] )
        {
            return 1;
        }
        else if( p == points[2] )
        {
            return 2;
        }
        throw new RuntimeException("Calling index with a point that doesn't exist in triangle");
    }
    
    public int indexCW( TriangulationPoint p )
    {
        int index = index(p);
        switch( index )
        {
            case 0: return 2;
            case 1: return 0;
            default: return 1;
        }
    }

    public int indexCCW( TriangulationPoint p )
    {
        int index = index(p);
        switch( index )
        {
            case 0: return 1;
            case 1: return 2;
            default: return 0;
        }
    }
    
    public boolean contains( TriangulationPoint p )
    {
        return ( p == points[0] || p == points[1] || p == points[2] );
    }

    public boolean contains( DTSweepConstraint e )
    {
        return ( contains( e.p ) && contains( e.q ) );
    }

    public boolean contains( TriangulationPoint p, TriangulationPoint q )
    {
        return ( contains( p ) && contains( q ) );
    }

    // Update neighbor pointers
    private void markNeighbor( TriangulationPoint p1, 
                               TriangulationPoint p2, 
                               DelaunayTriangle t )
    {
        if( ( p1 == points[2] && p2 == points[1] ) || ( p1 == points[1] && p2 == points[2] ) )
        {
            neighbors[0] = t;
        }
        else if( ( p1 == points[0] && p2 == points[2] ) || ( p1 == points[2] && p2 == points[0] ) )
        {
            neighbors[1] = t;
        }
        else if( ( p1 == points[0] && p2 == points[1] ) || ( p1 == points[1] && p2 == points[0] ) )
        {
            neighbors[2] = t;
        }
        else
        {
            logger.error( "Neighbor error, please report!" );
            // throw new Exception("Neighbor error, please report!");
        }
    }

    /* Exhaustive search to update neighbor pointers */
    public void markNeighbor( DelaunayTriangle t )
    {
        if( t.contains( points[1], points[2] ) )
        {
            neighbors[0] = t;
            t.markNeighbor( points[1], points[2], this );
        }
        else if( t.contains( points[0], points[2] ) )
        {
            neighbors[1] = t;
            t.markNeighbor( points[0], points[2], this );
        }
        else if( t.contains( points[0], points[1] ) )
        {
            neighbors[2] = t;
            t.markNeighbor( points[0], points[1], this );
        }
        else
        {
            logger.error( "markNeighbor failed" );
        }
    }

    public void clearNeighbors()
    {
        neighbors[0] = neighbors[1] = neighbors[2] = null;
    }

    public void clearNeighbor( DelaunayTriangle triangle )
    {
        if( neighbors[0] == triangle )
        {
            neighbors[0] = null;
        }
        else if( neighbors[1] == triangle )
        {
            neighbors[1] = null;            
        }
        else
        {
            neighbors[2] = null;
        }
    }

    /**
     * Clears all references to all other triangles and points
     */
    public void clear()
    {
        DelaunayTriangle t;
        for( int i=0; i<3; i++ )
        {
            t = neighbors[i];
            if( t != null )
            {
                t.clearNeighbor( this );
            }
        }
        clearNeighbors();
        points[0]=points[1]=points[2]=null;
    }
    /**
     * @param t - opposite triangle 
     * @param p - the point in t that isn't shared between the triangles
     * @return
     */
    public TriangulationPoint oppositePoint( DelaunayTriangle t, TriangulationPoint p )
    {
        assert t != this : "self-pointer error";
        return pointCW( t.pointCW(p) );
    }

    // The neighbor clockwise to given point
    public DelaunayTriangle neighborCW( TriangulationPoint point )
    {
        if( point == points[0] )
        {
            return neighbors[1];
        }
        else if( point == points[1] )
        {
            return neighbors[2];
        }
        return neighbors[0];
    }

    // The neighbor counter-clockwise to given point
    public DelaunayTriangle neighborCCW( TriangulationPoint point )
    {
        if( point == points[0] )
        {
            return neighbors[2];
        }
        else if( point == points[1] )
        {
            return neighbors[0];
        }
        return neighbors[1];
    }

    // The neighbor across to given point
    public DelaunayTriangle neighborAcross( TriangulationPoint opoint )
    {
        if( opoint == points[0] )
        {
            return neighbors[0];
        }
        else if( opoint == points[1] )
        {
            return neighbors[1];
        }
        return neighbors[2];
    }

    // The point counter-clockwise to given point
    public TriangulationPoint pointCCW( TriangulationPoint point )
    {
        if( point == points[0] )
        {
            return points[1];
        }
        else if( point == points[1] )
        {
            return points[2];
        }
        else if( point == points[2] )
        {
            return points[0];
        }
        logger.error( "point location error" );
        throw new RuntimeException("[FIXME] point location error");
    }

    // The point counter-clockwise to given point
    public TriangulationPoint pointCW( TriangulationPoint point )
    {
        if( point == points[0] )
        {
            return points[2];
        }
        else if( point == points[1] )
        {
            return points[0];
        }
        else if( point == points[2] )
        {
            return points[1];
        }
        logger.error( "point location error" );
        throw new RuntimeException("[FIXME] point location error");
    }

    // Legalize triangle by rotating clockwise around oPoint
    public void legalize( TriangulationPoint oPoint, TriangulationPoint nPoint )
    {
        if( oPoint == points[0] )
        {
            points[1] = points[0];
            points[0] = points[2];
            points[2] = nPoint;
        }
        else if( oPoint == points[1] )
        {
            points[2] = points[1];
            points[1] = points[0];
            points[0] = nPoint;
        }
        else if( oPoint == points[2] )
        {
            points[0] = points[2];
            points[2] = points[1];
            points[1] = nPoint;
        }
        else
        {
            logger.error( "legalization error" );
            throw new RuntimeException("legalization bug");
        }
    }

    public void printDebug()
    {
        System.out.println( points[0] + "," + points[1] + "," + points[2] );
    }

    // Finalize edge marking
    public void markNeighborEdges()
    {
        for( int i = 0; i < 3; i++ )
        {
            if( cEdge[i] )
            {
                switch( i )
                {
                    case 0:
                        if( neighbors[0] != null )
                            neighbors[0].markConstrainedEdge( points[1], points[2] );
                        break;
                    case 1:
                        if( neighbors[1] != null )
                            neighbors[1].markConstrainedEdge( points[0], points[2] );
                        break;
                    case 2:
                        if( neighbors[2] != null )
                            neighbors[2].markConstrainedEdge( points[0], points[1] );
                        break;
                }
            }
        }
    }

    public void markEdge( DelaunayTriangle triangle )
    {
        for( int i = 0; i < 3; i++ )
        {
            if( cEdge[i] )
            {
                switch( i )
                {
                    case 0:
                        triangle.markConstrainedEdge( points[1], points[2] );
                        break;
                    case 1:
                        triangle.markConstrainedEdge( points[0], points[2] );
                        break;
                    case 2:
                        triangle.markConstrainedEdge( points[0], points[1] );
                        break;
                }
            }
        }
    }

    public void markEdge( ArrayList<DelaunayTriangle> tList )
    {

        for( DelaunayTriangle t : tList )
        {
            for( int i = 0; i < 3; i++ )
            {
                if( t.cEdge[i] )
                {
                    switch( i )
                    {
                        case 0:
                            markConstrainedEdge( t.points[1], t.points[2] );
                            break;
                        case 1:
                            markConstrainedEdge( t.points[0], t.points[2] );
                            break;
                        case 2:
                            markConstrainedEdge( t.points[0], t.points[1] );
                            break;
                    }
                }
            }
        }
    }
    
    public void markConstrainedEdge( int index )
    {
        cEdge[index] = true;
    }
    
    public void markConstrainedEdge( DTSweepConstraint edge )
    {
        markConstrainedEdge( edge.p, edge.q );
        if(   ( edge.q == points[0] && edge.p == points[1] ) 
           || ( edge.q == points[1] && edge.p == points[0] ) )
        {
            cEdge[2] = true;
        }
        else if(   ( edge.q == points[0] && edge.p == points[2] ) 
                || ( edge.q == points[2] && edge.p == points[0] ) )
        {
            cEdge[1] = true;
        }
        else if(   ( edge.q == points[1] && edge.p == points[2] ) 
                || ( edge.q == points[2] && edge.p == points[1] ) )
        {
            cEdge[0] = true;
        }
    }

    // Mark edge as constrained
    public void markConstrainedEdge( TriangulationPoint p, TriangulationPoint q )
    {
        if( ( q == points[0] && p == points[1] ) || ( q == points[1] && p == points[0] ) )
        {
            cEdge[2] = true;
        }
        else if( ( q == points[0] && p == points[2] ) || ( q == points[2] && p == points[0] ) )
        {
            cEdge[1] = true;
        }
        else if( ( q == points[1] && p == points[2] ) || ( q == points[2] && p == points[1] ) )
        {
            cEdge[0] = true;
        }
    }

    public double area()
    {
        double a = (points[0].getX() - points[2].getX())*(points[1].getY() - points[0].getY());
        double b = (points[0].getX() - points[1].getX())*(points[2].getY() - points[0].getY());

        return 0.5*Math.abs( a - b );
    }

    public TPoint centroid()
    {
        double cx = ( points[0].getX() + points[1].getX() + points[2].getX() ) / 3d;
        double cy = ( points[0].getY() + points[1].getY() + points[2].getY() ) / 3d;
        return new TPoint( cx, cy );
    }

    /**
     * Get the neighbor that share this edge
     * 
     * @param constrainedEdge
     * @return index of the shared edge or -1 if edge isn't shared
     */
    public int edgeIndex( TriangulationPoint p1, TriangulationPoint p2 )
    {
        if( points[0] == p1 )
        {
            if( points[1] == p2 )
            {
                return 2;
            }
            else if( points[2] == p2 )
            {
                return 1;                
            }
        }
        else if( points[1] == p1 )
        {
            if( points[2] == p2 )
            {
                return 0;
            }
            else if( points[0] == p2 )
            {
                return 2;                
            }
        }
        else if( points[2] == p1 )
        {
            if( points[0] == p2 )
            {
                return 1;
            }
            else if( points[1] == p2 )
            {
                return 0;                
            }            
        }
        return -1;
    }

    public boolean getConstrainedEdgeCCW( TriangulationPoint p )
    {
        if( p == points[0] )
        {
            return cEdge[2];
        }
        else if( p == points[1] )
        {
            return cEdge[0];
        }
        return cEdge[1];
    }

    public boolean getConstrainedEdgeCW( TriangulationPoint p )
    {
        if( p == points[0] )
        {
            return cEdge[1];
        }
        else if( p == points[1] )
        {
            return cEdge[2];
        }
        return cEdge[0];
    }

    public boolean getConstrainedEdgeAcross( TriangulationPoint p )
    {
        if( p == points[0] )
        {
            return cEdge[0];
        }
        else if( p == points[1] )
        {
            return cEdge[1];
        }
        return cEdge[2];
    }

    public void setConstrainedEdgeCCW( TriangulationPoint p, boolean ce )
    {
        if( p == points[0] )
        {
            cEdge[2] = ce;
        }
        else if( p == points[1] )
        {
            cEdge[0] = ce;
        }
        else
        {
            cEdge[1] = ce;            
        }
    }

    public void setConstrainedEdgeCW( TriangulationPoint p, boolean ce )
    {
        if( p == points[0] )
        {
            cEdge[1] = ce;
        }
        else if( p == points[1] )
        {
            cEdge[2] = ce;
        }
        else
        {
            cEdge[0] = ce;            
        }
    }

    public void setConstrainedEdgeAcross( TriangulationPoint p, boolean ce )
    {
        if( p == points[0] )
        {
            cEdge[0] = ce;
        }
        else if( p == points[1] )
        {
            cEdge[1] = ce;
        }
        else
        {
            cEdge[2] = ce;            
        }
    }

    public boolean getDelunayEdgeCCW( TriangulationPoint p )
    {
        if( p == points[0] )
        {
            return dEdge[2];
        }
        else if( p == points[1] )
        {
            return dEdge[0];
        }
        return dEdge[1];
    }

    public boolean getDelunayEdgeCW( TriangulationPoint p )
    {
        if( p == points[0] )
        {
            return dEdge[1];
        }
        else if( p == points[1] )
        {
            return dEdge[2];
        }
        return dEdge[0];
    }

    public boolean getDelunayEdgeAcross( TriangulationPoint p )
    {
        if( p == points[0] )
        {
            return dEdge[0];
        }
        else if( p == points[1] )
        {
            return dEdge[1];
        }
        return dEdge[2];
    }

    public void setDelunayEdgeCCW( TriangulationPoint p, boolean e )
    {
        if( p == points[0] )
        {
            dEdge[2] = e;
        }
        else if( p == points[1] )
        {
            dEdge[0] = e;
        }
        else
        {
            dEdge[1] = e;            
        }
    }

    public void setDelunayEdgeCW( TriangulationPoint p, boolean e )
    {
        if( p == points[0] )
        {
            dEdge[1] = e;
        }
        else if( p == points[1] )
        {
            dEdge[2] = e;
        }
        else
        {
            dEdge[0] = e;            
        }
    }

    public void setDelunayEdgeAcross( TriangulationPoint p, boolean e )
    {
        if( p == points[0] )
        {
            dEdge[0] = e;
        }
        else if( p == points[1] )
        {
            dEdge[1] = e;
        }
        else
        {
            dEdge[2] = e;            
        }
    }

    public void clearDelunayEdges()
    {
        dEdge[0] = false;
        dEdge[1] = false;
        dEdge[2] = false;
    }

    public boolean isInterior()
    {
        return interior;
    }

    public void isInterior( boolean b )
    {
        interior = b;        
    }
}
