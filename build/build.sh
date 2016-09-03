#!/usr/bin/env bash

cd `dirname "$0"`

git rev-parse --short HEAD #make sure git in place

mkdir -p out
rm -rf out/*

> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/sketcher/viewer2d.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/sketcher/io.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/sketcher/history.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/sketcher/shapes/arc.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/sketcher/shapes/circle.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/sketcher/shapes/segment.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/sketcher/shapes/dim.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/sketcher/helpers.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/math/vector.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/math/math.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/math/qr.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/math/matrix.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/math/optim.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/math/lm.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/sketcher/constr/constraints.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/sketcher/constr/solver.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/sketcher/parametric.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/sketcher/fetchers.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/cad-utils.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/sketcher/sketcher-app.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/ui.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/ui/toolkit.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/math/graph.js >> out/app.js
java -jar yuic.jar --disable-optimizations ../web/app/init-sketcher-app.js >> out/app.js

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

