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

import org.poly2tri.triangulation.TriangulationConstraint;
import org.poly2tri.triangulation.TriangulationPoint;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 
 * @author Thomas Åhlén, thahlen@gmail.com
 *
 */
public class DTSweepConstraint extends TriangulationConstraint
{
    private final static Logger logger = LoggerFactory.getLogger( DTSweepConstraint.class );

    public TriangulationPoint p;
    public TriangulationPoint q;
    
    /**
     * Give two points in any order. Will always be ordered so
     * that q.y > p.y and q.x > p.x if same y value 
     * 
     * @param p1
     * @param p2
     */
    public DTSweepConstraint( TriangulationPoint p1, TriangulationPoint p2 )
//        throws DuplicatePointException
    {
        p = p1;
        q = p2;
        if( p1.getY() > p2.getY() )
        {
            q = p1;
            p = p2;
        }
        else if( p1.getY() == p2.getY() )
        {
            if( p1.getX() > p2.getX() )
            {
                q = p1;
                p = p2;
            }
            else if( p1.getX() == p2.getX() )
            {
                logger.info( "Failed to create constraint {}={}", p1, p2 );
//                throw new DuplicatePointException( p1 + "=" + p2 );
//                return;
            }
        }
        q.addEdge(this);
    }

//    public TPoint intersect( TPoint a, TPoint b )
//    {
//        double pqx,pqy,bax,bay,t;
//        
//        pqx = p.getX()-q.getX();
//        pqy = p.getY()-q.getY();
//        t = pqy*(a.getX()-q.getX()) - pqx*(a.getY()-q.getY() );
//        t /= pqx*(b.getY()-a.getY()) - pqy*(b.getX()-a.getX());
//        bax = t*(b.getX()-a.getX()) + a.getX();
//        bay = t*(b.getY()-a.getY()) + a.getY();
//        return new TPoint( bax, bay );
//    }

    public TriangulationPoint getP()
    {
        return p;
    }

    public TriangulationPoint getQ()
    {
        return q;
    }
}
