#!/usr/bin/env bash

cd `dirname "$0"`

git rev-parse --short HEAD #make sure git in place

mkdir -p out
rm -rf out/*

java -jar compiler.jar \
--js_output_file out/app.js \
--jscomp_off externsValidation \
--compilation_level ADVANCED_OPTIMIZATIONS \
--externs ../web/lib/jquery-2.1.0.min.js \
--externs ../web/lib/numeric-1.2.6.js \
--externs ../web/lib/diff_match_patch.js \
../web/app/sketcher/canvas.js \
../web/app/sketcher/io.js \
../web/app/sketcher/history.js \
../web/app/sketcher/shapes/arc.js \
../web/app/sketcher/shapes/circle.js \
../web/app/sketcher/shapes/segment.js \
../web/app/sketcher/shapes/dim.js \
../web/app/sketcher/helpers.js \
../web/app/math/vector.js \
../web/app/math/math.js \
../web/app/math/qr.js \
../web/app/math/matrix.js \
../web/app/math/optim.js \
../web/app/math/noptim.js \
../web/app/math/lm.js \
../web/app/sketcher/constr/constraints.js \
../web/app/sketcher/constr/solver.js \
../web/app/sketcher/parametric.js \
../web/app/sketcher/fetchers.js \
../web/app/engine.js \
../web/app/sketcher/main2d.js \
../web/app/ui.js \
../web/app/math/graph.js \
../web/app/app-init.js

sed -n \
'/<\!--\$\$\$javascript_start\$\$\$-->/{:a;N;/<\!--\$\$\$javascript_end\$\$\$-->/!ba;N;s|.*\n|  <script src="app.js"></script>|};p' \
 ../web/sketcher.html > out/sketcher.html

echo >> out/sketcher.html
echo '<!-- R:' "`git rev-parse --short HEAD` -->" >> out/sketcher.html

#now make it work inside out dir
ln -sf ../../web/img/ out/img
ln -sf ../../web/css/ out/css
mkdir -p out/lib
ln -sf ../../../web/lib/jquery-2.1.0.min.js out/lib/jquery-2.1.0.min.js
ln -sf ../../../web/lib/numeric-1.2.6.js out/lib/numeric-1.2.6.js
ln -sf ../../../web/lib/diff_match_patch.js out/lib/diff_match_patch.js
ln -sf ../../../web/lib/font-awesome out/lib/font-awesome

