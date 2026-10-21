import React from 'react';
import Svg, {Path, Rect} from 'react-native-svg';

interface PlayPauseIconProps {
  isPlaying: boolean;
  size: number;
  color: string;
}

/** Bare play / pause glyph (shows pause while playing). Stateless. */
export function PlayPauseIcon({isPlaying, size, color}: PlayPauseIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {isPlaying ? (
        <>
          <Rect x={5} y={4} width={4.5} height={16} rx={1.2} fill={color} />
          <Rect x={14.5} y={4} width={4.5} height={16} rx={1.2} fill={color} />
        </>
      ) : (
        <Path
          d="M7 4.8v14.4c0 .8.9 1.3 1.6.9l11.2-7.2c.6-.4.6-1.4 0-1.8L8.6 3.9C7.9 3.5 7 4 7 4.8z"
          fill={color}
        />
      )}
    </Svg>
  );
}
