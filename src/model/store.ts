import {configureStore} from '@reduxjs/toolkit';
import {setupListeners} from '@reduxjs/toolkit/query';
import {baseApi} from './api/baseApi';
import {pairingSlice, selectPairing} from './bridge/pairingSlice';
import {setBridgePairing} from './bridge/bridgeConnection';
import {
  exportedProjectsSlice,
  persistExportedProjects,
  selectExportedProjects,
} from './export/exportedProjectsSlice';

// Endpoints inject themselves into `baseApi` via side-effect imports. Importing
// feature APIs here guarantees their endpoints are registered before the store runs.
import './showcase/showcaseApi';
import './bridge/bridgeApi';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    [pairingSlice.name]: pairingSlice.reducer,
    [exportedProjectsSlice.name]: exportedProjectsSlice.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

// Enables refetchOnFocus / refetchOnReconnect behaviours.
setupListeners(store.dispatch);

// Keep the single bridge socket in step with the stored pairing.
store.subscribe(() => setBridgePairing(selectPairing(store.getState()).pairing));

// Write exported projects through to storage whenever the list changes.
let savedProjects = selectExportedProjects(store.getState());
store.subscribe(() => {
  const projects = selectExportedProjects(store.getState());
  if (projects !== savedProjects) {
    savedProjects = projects;
    persistExportedProjects(projects);
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
