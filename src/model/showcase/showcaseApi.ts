import {baseApi} from '../api/baseApi';
import type {ShowcaseDTO} from './types';

/**
 * Canonical video URLs. Centralised so a real backend swap only touches this file.
 */
const URLS = {
  gridParleTheatre:
    'https://assets.cardboard.ai/marketing/showcase/grid-parle-theatre.mp4',
  keyFramedPortal:
    'https://assets.cardboard.ai/marketing/prompt-hero/key-framed-portal.mp4',
  invisibleGlass:
    'https://assets.cardboard.ai/marketing/prompt-hero/invisible-glass-v2.mp4',
  documentary: 'https://assets.cardboard.ai/marketing/showcase/documentary.mp4',
  productLaunch:
    'https://assets.cardboard.ai/marketing/showcase/product-launch.mp4',
} as const;

/**
 * Local mock standing in for a `getShowcase` backend response. URLs repeat across
 * sections, so each video id is prefixed with its section to stay unique.
 */
const MOCK_SHOWCASE: ShowcaseDTO = [
  {
    id: 'featured',
    title: 'Featured',
    videos: [
      {id: 'featured-1', url: URLS.gridParleTheatre},
      {id: 'featured-2', url: URLS.keyFramedPortal},
      {id: 'featured-3', url: URLS.invisibleGlass},
      {id: 'featured-4', url: URLS.documentary},
      {id: 'featured-5', url: URLS.productLaunch},
    ],
  },
  {
    id: 'prompt-hero',
    title: 'Prompt Hero',
    videos: [
      {id: 'prompt-hero-1', url: URLS.keyFramedPortal},
      {id: 'prompt-hero-2', url: URLS.invisibleGlass},
      {id: 'prompt-hero-3', url: URLS.gridParleTheatre},
    ],
  },
  {
    id: 'showcase',
    title: 'Showcase',
    videos: [
      {id: 'showcase-1', url: URLS.documentary},
      {id: 'showcase-2', url: URLS.productLaunch},
      {id: 'showcase-3', url: URLS.gridParleTheatre},
    ],
  },
];

export const showcaseApi = baseApi.injectEndpoints({
  endpoints: build => ({
    getShowcase: build.query<ShowcaseDTO, void>({
      // `queryFn` returns the local mock. Replace this body with a real request
      // to move to a backend; no other layer changes.
      queryFn: async () => ({data: MOCK_SHOWCASE}),
    }),
  }),
  overrideExisting: false,
});

export const {useGetShowcaseQuery} = showcaseApi;
