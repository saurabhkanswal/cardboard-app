import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AppState, type ListViewToken as ViewToken} from 'react-native';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {useShowcaseViewModel} from '../../viewmodel/showcase/useShowcaseViewModel';
import {getActiveGridIds} from '../../viewmodel/showcase/showcaseRules';
import type {Section} from '../../viewmodel/showcase/types';

type ViewabilityHandler = (info: {viewableItems: ViewToken[]}) => void;

/** Top-level tabs on the showcase screen. */
export type ShowcaseTab = 'recipes' | 'projects';

export interface ShowcaseScreenController {
  activeTab: ShowcaseTab;
  setActiveTab: (tab: ShowcaseTab) => void;
  /** Rails to render for the active tab (empty on "projects" until it's built). */
  sections: Section[];
  isLoading: boolean;
  error: unknown;
  /** Ids in the active 3×3 window (top 3 on-screen rails × first 3 visible tiles). */
  loadedIds: Set<string>;
  /** Ids of videos allowed to play right now (visibility + focus + app-state + cap). */
  playingIds: Set<string>;
  retry: () => void;
  viewabilityConfig: {itemVisiblePercentThreshold: number};
  /** Viewability wiring for the vertical list of rails. */
  sectionViewabilityConfig: {itemVisiblePercentThreshold: number};
  onSectionsViewableChanged: ViewabilityHandler;
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
 * (via the ViewModel's `getActiveGridIds` rule) into the set of videos that may play.
 *
 * Must not import from `model/`.
 */
export function useShowcaseScreenController(): ShowcaseScreenController {
  const {sections, isLoading, error, refetch} = useShowcaseViewModel();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('recipes');
  // Projects has no content yet; rendering no rails also releases every player.
  const visibleSections = activeTab === 'recipes' ? sections : [];

  // Visible tile ids per rail, keyed by sectionId.
  const [visibleByRail, setVisibleByRail] = useState<Record<string, string[]>>(
    {},
  );

  // Rails currently on screen vertically. Each rail only reports horizontal
  // visibility, so without this, rails scrolled out of view still count as visible.
  const [visibleSectionIds, setVisibleSectionIds] = useState<Set<string>>(
    () => new Set(),
  );

  // Held in refs so the FlatList viewability config identity never changes.
  const viewabilityConfig = useRef({itemVisiblePercentThreshold: 30}).current;
  const sectionViewabilityConfig = useRef({itemVisiblePercentThreshold: 20})
    .current;

  const onSectionsViewableChanged = useRef<ViewabilityHandler>(
    ({viewableItems}) => {
      setVisibleSectionIds(
        new Set(viewableItems.map(token => (token.item as {id: string}).id)),
      );
    },
  ).current;

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

  // Active window: top 3 on-screen rails × first 3 visible tiles of each. Only these
  // hold a player, which keeps live decoders bounded however many rails there are;
  // the window slides as the user scrolls either axis.
  const loadedIds = useMemo(() => {
    const visibleIdsByRail = sections
      .filter(section => visibleSectionIds.has(section.id))
      .map(section => visibleByRail[section.id] ?? []);
    return new Set(getActiveGridIds(visibleIdsByRail));
  }, [sections, visibleSectionIds, visibleByRail]);

  // Everything in the window plays, unless the screen is blurred or backgrounded.
  const playingIds = useMemo(
    () => (isFocused && isActive ? loadedIds : new Set<string>()),
    [isFocused, isActive, loadedIds],
  );

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
    activeTab,
    setActiveTab,
    sections: visibleSections,
    isLoading,
    error,
    loadedIds,
    playingIds,
    retry: refetch,
    viewabilityConfig,
    sectionViewabilityConfig,
    onSectionsViewableChanged,
    getViewabilityHandler,
    onPressVideo,
  };
}
