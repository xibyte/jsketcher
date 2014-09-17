pkg load optim;

l1p1x = 1;
l1p1y = 2;
l1p2x = 3;
l1p2y = 4;
l2p1x = 5;
l2p1y = 6;
l2p2x = 7;
l2p2y = 8;

function out = g (x)

l1p1x = 1;
l1p1y = 2;
l1p2x = 3;
l1p2y = 4;
l2p1x = 5;
l2p1y = 6;
l2p2x = 7;
l2p2y = 8;
  p = x{1};
  out = [
     (p(l2p1y) - p(l2p2y));
    -(p(l2p1y) - p(l2p2y));
     (p(l2p1x) - p(l2p2x));
    -(p(l2p1x) - p(l2p2x));
     (p(l1p1y) - p(l1p2y));
    -(p(l1p1y) - p(l1p2y));
     (p(l1p1x) - p(l1p2x));
    -(p(l1p1x) - p(l1p2x));
  ];

endfunction

function out = phi (x)

l1p1x = 1;
l1p1y = 2;
l1p2x = 3;
l1p2y = 4;
l2p1x = 5;
l2p1y = 6;
l2p2x = 7;
l2p2y = 8;
  p = x{1};
  dx1 = (p(l1p1x) - p(l1p2x));
  dy1 = (p(l1p1y) - p(l1p2y));
  dx2 = (p(l2p1x) - p(l2p2x));
  dy2 = (p(l2p1y) - p(l2p2y));
  #dot product shows how the lines off to be perpendicular
  off = dx1 * dx2 + dy1 * dy2;
  out = off * off;
endfunction



l1 = [100, 100; 300, 600];
l2 = [400, 600; 600, 100];


x0 = [l1(1,1);l1(1,2);l1(2,1);l1(2,2);  l2(1,1);l2(1,2);l2(2,1);l2(2,2)];

#[x, obj, info, iter, nf, lambda] = sqp (x0, @phi, @g, []);

[a,b,c] = cg_min (@phi, @g, x0);


#plot([l1(1), l1(2)], [l1(3), l1(4)], '-');
#plot(reshape(l2, 2, 2));
plot(l1(:,1), l1(:,2), l2(:,1), l2(:,2), '-');

