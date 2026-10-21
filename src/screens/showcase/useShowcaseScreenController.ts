import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AppState, useWindowDimensions, type ListViewToken as ViewToken} from 'react-native';
import {useIsFocused, useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import {useShowcaseViewModel} from '../../viewmodel/showcase/useShowcaseViewModel';
import {getActiveGridIds} from '../../viewmodel/showcase/showcaseRules';
import type {Section} from '../../viewmodel/showcase/types';
import {useProjectsViewModel} from '../../viewmodel/projects/useProjectsViewModel';
import type {ExportedProject} from '../../viewmodel/projects/types';
import {spacing} from '../../theme';

type ViewabilityHandler = (info: {viewableItems: ViewToken[]}) => void;

/** Top-level tabs on the showcase screen. */
export type ShowcaseTab = 'recipes' | 'projects';

/** Declared locally (a `type`, so it satisfies ParamListBase) — screens may not import app/. */
type ShowcaseParamList = {
  Showcase: {tab?: ShowcaseTab} | undefined;
};

/** "Your projects" grid: columns, and the side gutter / gap the tile size is fitted to. */
const PROJECT_COLUMNS = 2;
const PROJECT_GUTTER = spacing.lg;
const PROJECT_GAP = spacing.md;
/** Rows of the grid allowed to hold a player at once (× PROJECT_COLUMNS). */
const PROJECT_ACTIVE_ROWS = 3;

/** One row of the "Your projects" grid; rows share the outer list with the recipe rails. */
export interface ProjectRow {
  id: string;
  projects: ExportedProject[];
}

/** An item of the outer vertical list: a recipe rail or a row of projects. */
export type ShowcaseItem =
  | {kind: 'rail'; id: string; section: Section}
  | {kind: 'projects'; id: string; row: ProjectRow};

export interface ShowcaseScreenController {
  activeTab: ShowcaseTab;
  setActiveTab: (tab: ShowcaseTab) => void;
  /** Recipe rails, or rows of exported projects, for the active tab. */
  items: ShowcaseItem[];
  /** "Your projects" is selected and has nothing in it yet. */
  isProjectsEmpty: boolean;
  projectTileWidth: number;
  projectTileHeight: number;
  projectGap: number;
  /** Opens an exported project full screen. */
  onPressProject: (id: string) => void;
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
  /** Opens the laptop-bridge pairing modal. */
  onPressConnect: () => void;
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
  // Other screens can ask for a tab, e.g. the editor lands on "projects" after export.
  const requestedTab = useRoute<RouteProp<ShowcaseParamList, 'Showcase'>>().params?.tab;
  useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab);
      // Consume it, so asking for the same tab again still switches.
      navigation.setParams({tab: undefined});
    }
  }, [requestedTab, navigation]);
  const {projects} = useProjectsViewModel();
  const window = useWindowDimensions();
  const projectTileWidth = Math.floor(
    (window.width - 2 * PROJECT_GUTTER - (PROJECT_COLUMNS - 1) * PROJECT_GAP) / PROJECT_COLUMNS,
  );
  // Exports are vertical reels.
  const projectTileHeight = Math.round((projectTileWidth * 16) / 9);

  const projectRows = useMemo(() => {
    const rows: ProjectRow[] = [];
    for (let i = 0; i < projects.length; i += PROJECT_COLUMNS) {
      const chunk = projects.slice(i, i + PROJECT_COLUMNS);
      rows.push({id: `projects-${chunk[0].id}`, projects: chunk});
    }
    return rows;
  }, [projects]);

  // Only the active tab's items render, so the other tab's players are released.
  const items = useMemo<ShowcaseItem[]>(
    () =>
      activeTab === 'recipes'
        ? sections.map(section => ({kind: 'rail', id: section.id, section}))
        : projectRows.map(row => ({kind: 'projects', id: row.id, row})),
    [activeTab, sections, projectRows],
  );

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
  // On "Your projects" the same rule runs over the visible grid rows (3 rows × 2).
  const loadedIds = useMemo(() => {
    if (activeTab === 'projects') {
      const visibleRows = projectRows
        .filter(row => visibleSectionIds.has(row.id))
        .map(row => row.projects.map(p => p.id));
      return new Set(getActiveGridIds(visibleRows, PROJECT_ACTIVE_ROWS, PROJECT_COLUMNS));
    }
    const visibleIdsByRail = sections
      .filter(section => visibleSectionIds.has(section.id))
      .map(section => visibleByRail[section.id] ?? []);
    return new Set(getActiveGridIds(visibleIdsByRail));
  }, [activeTab, projectRows, sections, visibleSectionIds, visibleByRail]);

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
      // The tile only knows ids; the recipe comes from the showcase data.
      const recipeId = sections
        .find(section => section.id === sectionId)
        ?.videos.find(video => video.id === videoId)?.recipeId;
      navigation.navigate('Remix', {sectionId, videoId, uri, recipeId});
    },
    [navigation, sections],
  );

  const onPressProject = useCallback(
    (id: string) => navigation.navigate('ProjectPlayer', {id}),
    [navigation],
  );

  const onPressConnect = useCallback(
    () => navigation.navigate('Pairing'),
    [navigation],
  );

  return {
    activeTab,
    setActiveTab,
    items,
    isProjectsEmpty: activeTab === 'projects' && projects.length === 0,
    projectTileWidth,
    projectTileHeight,
    projectGap: PROJECT_GAP,
    onPressProject,
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
    onPressConnect,
  };
}
