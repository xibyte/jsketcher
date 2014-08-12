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
 */package org.poly2tri.triangulation;


/**
 * @author Thomas Åhlén, thahlen@gmail.com
 */
public class TriangulationUtil
{
    public final static double    EPSILON = 1e-12;

    // Returns triangle circumcircle point and radius
//    public static Tuple2<TPoint, Double> circumCircle( TPoint a, TPoint b, TPoint c )
//    {
//        double A = det( a, b, c );
//        double C = detC( a, b, c );
//
//        double sa = a.getX() * a.getX() + a.getY() * a.getY();
//        double sb = b.getX() * b.getX() + b.getY() * b.getY();
//        double sc = c.getX() * c.getX() + c.getY() * c.getY();
//
//        TPoint bx1 = new TPoint( sa, a.getY() );
//        TPoint bx2 = new TPoint( sb, b.getY() );
//        TPoint bx3 = new TPoint( sc, c.getY() );
//        double bx = det( bx1, bx2, bx3 );
//
//        TPoint by1 = new TPoint( sa, a.getX() );
//        TPoint by2 = new TPoint( sb, b.getX() );
//        TPoint by3 = new TPoint( sc, c.getX() );
//        double by = det( by1, by2, by3 );
//
//        double x = bx / ( 2 * A );
//        double y = by / ( 2 * A );
//
//        TPoint center = new TPoint( x, y );
//        double radius = Math.sqrt( bx * bx + by * by - 4 * A * C ) / ( 2 * Math.abs( A ) );
//
//        return new Tuple2<TPoint, Double>( center, radius );
//    }

    /**
     * <b>Requirement</b>:<br>
     * 1. a,b and c form a triangle.<br>
     * 2. a and d is know to be on opposite side of bc<br>
     * <pre>
     *                a
     *                +
     *               / \
     *              /   \
     *            b/     \c
     *            +-------+ 
     *           /    B    \  
     *          /           \ 
     * </pre>
     * <b>Fact</b>: d has to be in area B to have a chance to be inside the circle formed by
     *  a,b and c<br>
     *  d is outside B if orient2d(a,b,d) or orient2d(c,a,d) is CW<br>
     *  This preknowledge gives us a way to optimize the incircle test
     * @param a - triangle point, opposite d
     * @param b - triangle point
     * @param c - triangle point
     * @param d - point opposite a 
     * @return true if d is inside circle, false if on circle edge
     */
    public static boolean smartIncircle( final TriangulationPoint pa, 
                                         final TriangulationPoint pb, 
                                         final TriangulationPoint pc, 
                                         final TriangulationPoint pd )
    {
        final double pdx = pd.getX();
        final double pdy = pd.getY();
        final double adx = pa.getX() - pdx;
        final double ady = pa.getY() - pdy;        
        final double bdx = pb.getX() - pdx;
        final double bdy = pb.getY() - pdy;

        final double adxbdy = adx * bdy;
        final double bdxady = bdx * ady;
        final double oabd = adxbdy - bdxady;
//        oabd = orient2d(pa,pb,pd);
        if( oabd <= 0 )
        {
            return false;
        }

        final double cdx = pc.getX() - pdx;
        final double cdy = pc.getY() - pdy;

        final double cdxady = cdx * ady;
        final double adxcdy = adx * cdy;
        final double ocad = cdxady - adxcdy;
//      ocad = orient2d(pc,pa,pd);
        if( ocad <= 0 )
        {
            return false;
        }
        
        final double bdxcdy = bdx * cdy;
        final double cdxbdy = cdx * bdy;
        
        final double alift = adx * adx + ady * ady;
        final double blift = bdx * bdx + bdy * bdy;
        final double clift = cdx * cdx + cdy * cdy;

        final double det = alift * ( bdxcdy - cdxbdy ) + blift * ocad + clift * oabd;

        return det > 0;
    }
    
    /**
     * @see smartIncircle
     * @param pa
     * @param pb
     * @param pc
     * @param pd
     * @return
     */
    public static boolean inScanArea( final TriangulationPoint pa, 
                                      final TriangulationPoint pb, 
                                      final TriangulationPoint pc, 
                                      final TriangulationPoint pd )
    {
        final double pdx = pd.getX();
        final double pdy = pd.getY();
        final double adx = pa.getX() - pdx;
        final double ady = pa.getY() - pdy;        
        final double bdx = pb.getX() - pdx;
        final double bdy = pb.getY() - pdy;

        final double adxbdy = adx * bdy;
        final double bdxady = bdx * ady;
        final double oabd = adxbdy - bdxady;
//        oabd = orient2d(pa,pb,pd);
        if( oabd <= 0 )
        {
            return false;
        }

        final double cdx = pc.getX() - pdx;
        final double cdy = pc.getY() - pdy;

        final double cdxady = cdx * ady;
        final double adxcdy = adx * cdy;
        final double ocad = cdxady - adxcdy;
//      ocad = orient2d(pc,pa,pd);
        if( ocad <= 0 )
        {
            return false;
        } 
        return true;
    }
    
    /**
     * Forumla to calculate signed area<br>
     * Positive if CCW<br>
     * Negative if CW<br>
     * 0 if collinear<br>
     * <pre>
     * A[P1,P2,P3]  =  (x1*y2 - y1*x2) + (x2*y3 - y2*x3) + (x3*y1 - y3*x1)
     *              =  (x1-x3)*(y2-y3) - (y1-y3)*(x2-x3)
     * </pre>             
     */
    public static Orientation orient2d( TriangulationPoint pa, 
                                        TriangulationPoint pb, 
                                        TriangulationPoint pc )
    {
        double detleft = ( pa.getX() - pc.getX() ) * ( pb.getY() - pc.getY() );
        double detright = ( pa.getY() - pc.getY() ) * ( pb.getX() - pc.getX() );
        double val = detleft - detright;
        if( val > -EPSILON && val < EPSILON )
        {
            return Orientation.Collinear;                    
        }
        else if( val > 0 )
        {
            return Orientation.CCW;
        }
        return Orientation.CW;
    }

    public enum Orientation
    {
        CW,CCW,Collinear;
    }
}
