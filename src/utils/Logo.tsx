import { FC } from "react";

export const Logo: FC<{
  width?: string;
  height?: string;
  fillColor?: string;
}> = ({ width = "34", height = "41", fillColor = "#BCF124" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 34 41"
      fill="none"
    >
      <g fill={fillColor} clipPath="url(#a)">
        <path d="M7.801 17.083H.567a16.578 16.578 0 0 1 4.82-11.67A16.416 16.416 0 0 1 17 .569v7.27a9.192 9.192 0 0 0-6.5 2.712A9.282 9.282 0 0 0 7.8 17.083ZM16.996 41a16.412 16.412 0 0 1-11.61-4.842A16.574 16.574 0 0 1 .565 24.49H7.8c0 1.829.54 3.616 1.551 5.137a9.21 9.21 0 0 0 4.13 3.405c1.68.7 3.53.883 5.315.526a9.187 9.187 0 0 0 4.71-2.53 9.26 9.26 0 0 0 2.519-4.734 9.288 9.288 0 0 0-.524-5.342 9.236 9.236 0 0 0-3.389-4.15A9.169 9.169 0 0 0 17 15.244V7.972c4.358 0 8.538 1.74 11.62 4.837a16.555 16.555 0 0 1 4.813 11.677c0 4.38-1.731 8.58-4.813 11.677A16.392 16.392 0 0 1 17 41h-.004Z" />
      </g>
      <defs>
        <clipPath id="a">
          <path fill="#fff" d="M0 0h34v41H0z" />
        </clipPath>
      </defs>
    </svg>
  );
};
