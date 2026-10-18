import {createApi, fakeBaseQuery} from '@reduxjs/toolkit/query/react';

/**
 * Root RTK Query API. Feature endpoints are added via `injectEndpoints` in their
 * own files (e.g. `model/showcase/showcaseApi.ts`) so each feature's I/O stays
 * self-contained.
 *
 * Uses `fakeBaseQuery` for now: every endpoint supplies its own `queryFn`.
 * Swapping to a real backend means giving this a real `baseQuery` and changing
 * the feature endpoints — nothing above the Model layer moves.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fakeBaseQuery(),
  endpoints: () => ({}),
});
