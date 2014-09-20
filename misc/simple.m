function y = angle (x)

a = [x(3) - x(1); x(4) - x(2)];
b = [x(7) - x(5); x(8) - x(6)];

y = acos(dot(a, b) / (norm(a) * norm(b))) / pi * 180;

endfunction

function y = f (x)
  y(1) = (
    (x(3) - x(1)) * (x(7) - x(5))  +
    (x(4) - x(2)) * (x(8) - x(6))  
  ) ^ 2;
endfunction

x0 = [100, 100, 600, 600, 700, 600, 900, 100];
x = sqp(x0, @f);

#pkg load optim;
#x = bfgsmin('f', {reshape(x0, 8,1)}); #WORKS!


l1 = [x(1), x(2); x(3), x(4)];
l2 = [x(5), x(6); x(7), x(8)];

plot(l1(:,1), l1(:,2), l2(:,1), l2(:,2), '-');


#d = (x(3) - x(1)) * (x(7) - x(5))  + (x(4) - x(2)) * (x(8) - x(6)) ;
disp("Angle: "), disp(angle(x));
