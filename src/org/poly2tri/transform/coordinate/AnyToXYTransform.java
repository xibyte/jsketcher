package org.poly2tri.transform.coordinate;

/**
 * A transform that aligns given source normal with the XY plane normal [0,0,1]
 * 
 * @author thahlen@gmail.com
 */

public class AnyToXYTransform extends Matrix3Transform
{
    /**
     * Assumes source normal is normalized
     */ 
    public AnyToXYTransform( double nx, double ny, double nz )
    {
        setSourceNormal( nx, ny, nz );
    }
    
    /**
     * Assumes source normal is normalized
     * 
     * @param nx
     * @param ny
     * @param nz
     */
    public void setSourceNormal( double nx, double ny, double nz )
    {
        double h,f,c,vx,vy,hvx;

        vx = -ny;
        vy = nx;
        c = nz;
        
        h = (1-c)/(1-c*c);
        hvx = h*vx;
        f = (c < 0) ? -c : c;                
        
        if( f < 1.0 - 1.0E-4 ) 
        {
            m00=c + hvx*vx;
            m01=hvx*vy;
            m02=-vy;
            m10=hvx*vy;
            m11=c + h*vy*vy;
            m12=vx;
            m20=vy;
            m21=-vx;
            m22=c;
        }
        else
        {
            // if "from" and "to" vectors are nearly parallel
            m00=1;
            m01=0;
            m02=0;
            m10=0;
            m11=1;
            m12=0;
            m20=0;
            m21=0;
            if( c > 0 )
            {
                m22=1;                
            }
            else
            {
                m22=-1;
            }
        }        
    }    
}
