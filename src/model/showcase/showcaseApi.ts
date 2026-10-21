import {baseApi} from '../api/baseApi';
import type {ShowcaseDTO} from './types';

/**
 * Recipe preview clips (~200 KB each — far lighter than the full `recipes/videos/`
 * renders, which suits autoplaying tiles). Centralised so a real backend swap only
 * touches this file.
 */
const PREVIEW_BASE = 'https://assets.cardboard.ai/recipes/previews';
const preview = (hash: string) => `${PREVIEW_BASE}/${hash}.mp4`;

/**
 * Local mock standing in for a `getShowcase` backend response. Each video id is
 * prefixed with its section to stay unique.
 */
const MOCK_SHOWCASE: ShowcaseDTO = [
  {
    // Recipes the laptop bridge can run end to end.
    id: 'laptop-ready',
    title: 'Remix with your laptop',
    videos: [
      {id: 'laptop-ready-simple-ugc', url: preview('ef3a00a5550a4681'), recipeId: 'simple-ugc'},
      {
        id: 'laptop-ready-laptop-feature',
        url: preview('4650712fbaf9dbfe'),
        recipeId: 'laptop-product-overview',
      },
      {
        id: 'laptop-ready-podcast-review',
        url: preview('d8f3703e08a1b189'),
        recipeId: 'podcast-product-review',
      },
    ],
  },
  {
    id: 'launch-video',
    title: 'Launch video',
    videos: [
      {id: 'launch-video-1', url: preview('96f27e097ce15e25')},
      {id: 'launch-video-2', url: preview('a5eb5f1a4f92d0f8')},
      {id: 'launch-video-3', url: preview('219f622b21418890')},
      {id: 'launch-video-4', url: preview('b29b32da636455c6')},
      {id: 'launch-video-5', url: preview('29c7347bf074e238')},
      {id: 'launch-video-6', url: preview('ef3a00a5550a4681'), recipeId: 'simple-ugc'},
    ],
  },
  {
    id: 'effect',
    title: 'Effect',
    videos: [
      {id: 'effect-1', url: preview('ba04d76b9a4e6441')},
      {id: 'effect-2', url: preview('d5eb42dbfb8169f9')},
      {id: 'effect-3', url: preview('65b2f9c02566d65b')},
      {id: 'effect-4', url: preview('aa77b185ff81724c')},
      {id: 'effect-5', url: preview('c006466017bf7fbd')},
    ],
  },
  {
    id: 'vlog',
    title: 'Vlog',
    videos: [
      {id: 'vlog-1', url: preview('08eaf359d2528cbc')},
      {id: 'vlog-2', url: preview('d0d969d1116fc396')},
      {id: 'vlog-3', url: preview('d05b8df576703091')},
      {id: 'vlog-4', url: preview('5fab632fe5317169')},
      {id: 'vlog-5', url: preview('185576e1a5f54031')},
      {id: 'vlog-6', url: preview('fb717aa55576654e')},
    ],
  },
  {
    id: 'viral-trends',
    title: 'Viral trends',
    videos: [
      {id: 'viral-trends-1', url: preview('910e89703e5ce675')},
      {id: 'viral-trends-2', url: preview('019e2744db94d336')},
      {id: 'viral-trends-3', url: preview('77d354facd99ece6')},
      {id: 'viral-trends-4', url: preview('5c28cb10335b7f10')},
      {id: 'viral-trends-5', url: preview('51d8088b7b961149')},
    ],
  },
  {
    id: 'travel-montage',
    title: 'Travel montage',
    videos: [
      {id: 'travel-montage-1', url: preview('571354db205798f0')},
      {id: 'travel-montage-2', url: preview('e97598f216482c1f')},
      {id: 'travel-montage-3', url: preview('21d85ba62413d450')},
      {id: 'travel-montage-4', url: preview('e66f16b563b77633')},
      {id: 'travel-montage-5', url: preview('011a904ac5bd3f5c')},
      {id: 'travel-montage-6', url: preview('992af9030b6ed7e7')},
    ],
  },
  {
    id: 'product-showcase',
    title: 'Product showcase',
    videos: [
      {id: 'product-showcase-1', url: preview('7c257c7c236e38b5')},
      {id: 'product-showcase-2', url: preview('771d872e7110c739')},
      {id: 'product-showcase-3', url: preview('032ad5d7edf3ea62')},
      {id: 'product-showcase-4', url: preview('8c70ef43e7ad13b5')},
      {id: 'product-showcase-5', url: preview('2204d2f21fe2b357')},
    ],
  },
  {
    id: 'clipping',
    title: 'Clipping',
    videos: [
      {id: 'clipping-1', url: preview('66127350cb692340')},
      {id: 'clipping-2', url: preview('3f741dd0ec1f5fbd')},
      {id: 'clipping-3', url: preview('7e002dc676976a1f')},
      {id: 'clipping-4', url: preview('35239764988c3aca')},
      {id: 'clipping-5', url: preview('3cabc38d85c1ee13')},
      {id: 'clipping-6', url: preview('b862a9f5421cd38e')},
    ],
  },
  {
    id: 'after-movie',
    title: 'After movie',
    videos: [
      {id: 'after-movie-1', url: preview('e26c91d25230c1d0')},
      {id: 'after-movie-2', url: preview('06a98ef607270c83')},
      {id: 'after-movie-3', url: preview('739be9fd1e6a2f2f')},
      {id: 'after-movie-4', url: preview('64614fc98e20079c')},
      {id: 'after-movie-5', url: preview('4ec9bcbb45c96e3b')},
    ],
  },
  {
    id: 'talking-head',
    title: 'Talking head',
    videos: [
      {id: 'talking-head-1', url: preview('dbc7b2847a99cb0c')},
      {id: 'talking-head-2', url: preview('0efff24488047c85')},
      {id: 'talking-head-3', url: preview('b51d58cccfd3a0c3')},
      {id: 'talking-head-4', url: preview('520b6f5d16a2f83e')},
      {id: 'talking-head-5', url: preview('921dec2c7a61e959')},
      {id: 'talking-head-6', url: preview('d71ea214bf715cb8')},
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
