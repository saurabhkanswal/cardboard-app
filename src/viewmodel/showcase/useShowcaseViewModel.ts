import {useMemo} from 'react';
import {useGetShowcaseQuery} from '../../model/showcase/showcaseApi';
import {mapSections} from './showcaseMappers';
import type {Section} from './types';

export interface ShowcaseViewModel {
  sections: Section[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * The ONLY place that calls the showcase RTK Query hook. Shapes the DTO into the
 * domain model and exposes loading/error state plus a refetch action. Screen- and
 * UI-agnostic: any screen that needs showcase data uses this.
 */
export function useShowcaseViewModel(): ShowcaseViewModel {
  const {data, isLoading, error, refetch} = useGetShowcaseQuery();

  const sections = useMemo(() => mapSections(data ?? []), [data]);

  return {
    sections,
    isLoading,
    error,
    refetch,
  };
}
