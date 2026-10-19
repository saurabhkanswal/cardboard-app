import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AppState, type ListViewToken as ViewToken} from 'react-native';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {useShowcaseViewModel} from '../../viewmodel/showcase/useShowcaseViewModel';
import {
  DEFAULT_MAX_PLAYING,
  getPlayableIds,
} from '../../viewmodel/showcase/showcaseRules';
import type {Section} from '../../viewmodel/showcase/types';

type ViewabilityHandler = (info: {viewableItems: ViewToken[]}) => void;

export interface ShowcaseScreenController {
  sections: Section[];
  isLoading: boolean;
  error: unknown;
  /** Ids of videos allowed to play right now (visibility + focus + app-state + cap). */
  playingIds: Set<string>;
  retry: () => void;
  viewabilityConfig: {itemVisiblePercentThreshold: number};
  /** Stable `onViewableItemsChanged` handler for a given rail. */
  getViewabilityHandler: (sectionId: string) => ViewabilityHandler;
  /** Opens the remix modal for a tapped video. */
  onPressVideo: (p: {
    sectionId: string;
    videoId: string;
    uri: string;
  }) => void;
}

/**
 * Screen-specific glue for the showcase screen. Owns UI concerns: which tiles are
 * visible per rail, screen focus, app foreground/background — and combines them
 * (via the ViewModel's `getPlayableIds` rule) into the set of videos that may play.
 *
 * Must not import from `model/`.
 */
export function useShowcaseScreenController(): ShowcaseScreenController {
  const {sections, isLoading, error, refetch} = useShowcaseViewModel();
  const navigation = useNavigation();

  // Visible tile ids per rail, keyed by sectionId.
  const [visibleByRail, setVisibleByRail] = useState<Record<string, string[]>>(
    {},
  );

  // Held in a ref so the FlatList viewability config identity never changes.
  const viewabilityConfig = useRef({itemVisiblePercentThreshold: 60}).current;

  // Cache one stable handler per rail so FlatList doesn't see a changing callback.
  const handlerCache = useRef<Record<string, ViewabilityHandler>>({});
  const getViewabilityHandler = useCallback((sectionId: string) => {
    const cached = handlerCache.current[sectionId];
    if (cached) {
      return cached;
    }
    const handler: ViewabilityHandler = ({viewableItems}) => {
      const ids = viewableItems
        .map(token => token.item as {id: string})
        .map(item => item.id);
      setVisibleByRail(prev => ({...prev, [sectionId]: ids}));
    };
    handlerCache.current[sectionId] = handler;
    return handler;
  }, []);

  const isFocused = useIsFocused();
  const [isActive, setIsActive] = useState(
    AppState.currentState === 'active',
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      setIsActive(state === 'active');
    });
    return () => sub.remove();
  }, []);

  const playingIds = useMemo(() => {
    if (!isFocused || !isActive) {
      return new Set<string>();
    }
    // Flatten rails in section order → the rule caps total concurrent playback.
    const allVisible = sections.flatMap(
      section => visibleByRail[section.id] ?? [],
    );
    return new Set(getPlayableIds(allVisible, DEFAULT_MAX_PLAYING));
  }, [isFocused, isActive, sections, visibleByRail]);

  const onPressVideo = useCallback(
    ({
      sectionId,
      videoId,
      uri,
    }: {
      sectionId: string;
      videoId: string;
      uri: string;
    }) => {
      navigation.navigate('Remix', {sectionId, videoId, uri});
    },
    [navigation],
  );

  return {
    sections,
    isLoading,
    error,
    playingIds,
    retry: refetch,
    viewabilityConfig,
    getViewabilityHandler,
    onPressVideo,
  };
}
