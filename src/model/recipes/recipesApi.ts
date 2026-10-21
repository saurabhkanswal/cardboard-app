import {baseApi} from '../api/baseApi';
import type {RecipeDTO} from './types';

/**
 * Local mock of the recipe catalog, copied from Cardboard's catalog for the kits the bridge
 * ships. Replace the query body with a real request to move to a backend.
 */
const MOCK_RECIPES: Record<string, RecipeDTO> = {
  'simple-ugc': {
    id: 'simple-ugc',
    name: 'Simple UGC',
    mediaPrompt: 'Add your talking-to-camera clips',
    mediaHint: 'Up to 5 clips. Vertical works best, up to 90 seconds each.',
    fields: [
      {
        id: 'names',
        label: 'Names to spell correctly',
        placeholder: 'Glowberry Vitamin C',
        optional: true,
        maxLength: 120,
      },
    ],
  },
  'laptop-product-overview': {
    id: 'laptop-product-overview',
    name: 'Laptop Feature Film',
    mediaPrompt: 'Add laptop demo or teardown clips',
    mediaHint: 'Up to 5 clips. Include a spoken feature explanation.',
    fields: [
      {
        id: 'topic',
        label: 'Laptop or product name',
        placeholder: 'My modular laptop',
        optional: false,
        maxLength: 80,
      },
      {
        id: 'brief',
        label: 'Features to highlight',
        placeholder: 'Replaceable battery, easy repairs',
        optional: true,
        maxLength: 240,
      },
    ],
  },
  'podcast-product-review': {
    id: 'podcast-product-review',
    name: 'Podcast Product Review',
    mediaPrompt: 'Add hands-on podcast clips',
    mediaHint: 'Up to 5 clips. Wide or two-person shots where the speakers handle and explain the product.',
    fields: [
      {
        id: 'topic',
        label: 'Product being reviewed',
        placeholder: 'Wireless headphones',
        optional: false,
        maxLength: 80,
      },
      {
        id: 'brief',
        label: 'Review points',
        placeholder: 'Comfort, sound and controls',
        optional: true,
        maxLength: 240,
      },
    ],
  },
};

export const recipesApi = baseApi.injectEndpoints({
  endpoints: build => ({
    getRecipe: build.query<RecipeDTO, string>({
      queryFn: async id => {
        const recipe = MOCK_RECIPES[id];
        return recipe
          ? {data: recipe}
          : {error: {status: 404, message: `Unknown recipe "${id}"`}};
      },
    }),
  }),
  overrideExisting: false,
});

export const {useGetRecipeQuery} = recipesApi;
