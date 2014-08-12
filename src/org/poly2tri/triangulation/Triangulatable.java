package org.poly2tri.triangulation;

import java.util.List;

import org.poly2tri.triangulation.delaunay.DelaunayTriangle;

public interface Triangulatable
{
    /**
     * Preparations needed before triangulation start should be handled here
     * @param tcx
     */
    public void prepareTriangulation(TriangulationContext<?> tcx);
    
    public List<DelaunayTriangle> getTriangles();
    public List<TriangulationPoint> getPoints();
    public void addTriangle(DelaunayTriangle t);
    public void addTriangles(List<DelaunayTriangle> list);
    public void clearTriangulation();
    
    public TriangulationMode getTriangulationMode();
}
