# LOFT
The LOFT command allows for selection of 2 or more closed sketch loops that are not on the same plane. A new solid is created between the two closed sketch loops. It is useful for creating things like an aircraft wing where multiple cross sections are specified as sketches and a solid body is created by creating faces between these sections.

If more than 2 loops are used to create the shape specifying the loft type as smooth will result in smooth faces being created between each of the sections. Specifying sharp will result in separate faces for each segment in each subsection of the loft

The boolean drop down and target allows for boolean operations with existing 3d solids. 