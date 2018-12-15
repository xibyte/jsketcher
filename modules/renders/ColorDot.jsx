import React from 'react';

export default function ColorDot({color}) {
  return <span style={{
    color: color,
    mixBlendMode: 'exclusion'
  }}>◉</span>;
}