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

import org.poly2tri.triangulation.TriangulationPoint;


/**
 * @author Thomas Åhlen (thahlen@gmail.com)
 */
public class AdvancingFront
{
    public AdvancingFrontNode head;
    public AdvancingFrontNode tail;
    protected AdvancingFrontNode search;
    
    public AdvancingFront( AdvancingFrontNode head, AdvancingFrontNode tail )
    {
        this.head = head;
        this.tail = tail;
        this.search = head;
        addNode( head );
        addNode( tail );
    }

    public void addNode( AdvancingFrontNode node )
    {
//        _searchTree.put( node.key, node );
    }
    
    public void removeNode( AdvancingFrontNode node )
    {
//        _searchTree.delete( node.key );
    }
    
    public String toString()
    {
        StringBuilder sb = new StringBuilder();
        AdvancingFrontNode node = head;
        while( node != tail )
        {
            sb.append( node.point.getX() ).append( "->" );
            node = node.next;
        } 
        sb.append( tail.point.getX() );
        return sb.toString();
    }
    
    private final AdvancingFrontNode findSearchNode( double x )
    {
        // TODO: implement BST index 
        return search;
    }

    /**
     * We use a balancing tree to locate a node smaller or equal to
     * given key value
     * 
     * @param x
     * @return
     */
    public AdvancingFrontNode locateNode( TriangulationPoint point )
    {
        return locateNode( point.getX() );
    }

    private AdvancingFrontNode locateNode( double x )
    {
        AdvancingFrontNode node = findSearchNode(x);
        if( x < node.value )
        {
            while( (node = node.prev) != null )
            {
                if( x >= node.value )
                {
                    search = node;
                    return node;
                }
            }
        }
        else
        {
            while( (node = node.next) != null )
            {
                if( x < node.value )
                {
                    search = node.prev;
                    return node.prev;
                }
            }
        }
        return null;
    }
    
    /**
     * This implementation will use simple node traversal algorithm to find
     * a point on the front
     * 
     * @param point
     * @return
     */
    public AdvancingFrontNode locatePoint( final TriangulationPoint point )
    {
        final double px = point.getX();
        AdvancingFrontNode node = findSearchNode(px);
        final double nx = node.point.getX();

        if( px == nx  )
        {
            if( point != node.point )
            {
                // We might have two nodes with same x value for a short time
                if( point == node.prev.point )
                {
                    node = node.prev;
                }
                else if( point == node.next.point )
                {
                    node = node.next;
                }
                else
                {
                    throw new RuntimeException( "Failed to find Node for given afront point");
//                    node = null;
                }
            }
        }
        else if( px < nx )
        {
            while( (node = node.prev) != null )
            {
                if( point == node.point )
                {
                    break;
                }
            }
        }
        else
        {
            while( (node = node.next) != null )
            {
                if( point == node.point )
                {
                    break;
                }
            }
        }
        search = node;
        return node;
    }
}