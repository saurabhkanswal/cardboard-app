import React from 'react';
import Svg, {Path} from 'react-native-svg';

interface UndoIconProps {
  size: number;
  color: string;
}

/** Bare counter-clockwise "undo" arrow. Stateless. */
export function UndoIcon({size, color}: UndoIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 14 4 9l5-5"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
