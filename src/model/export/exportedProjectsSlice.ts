import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import Storage from 'expo-sqlite/kv-store';

/** One finished export, kept on the device. */
export interface ExportedProjectRecord {
  id: string;
  /** Bridge project it was rendered from. */
  projectId: string;
  /** File name in the documents folder (see `exportUri`). */
  fileName: string;
  /** Epoch ms. */
  createdAt: number;
  /** Seconds. */
  duration: number;
}

export interface ExportedProjectsState {
  items: ExportedProjectRecord[];
}

/** Bump the suffix if the record shape changes incompatibly. */
const STORAGE_KEY = 'exportedProjects.v1';

function load(): ExportedProjectRecord[] {
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ExportedProjectRecord[]) : [];
  } catch {
    return [];
  }
}

/** Synchronous, like onboarding: the list is ready on the first render. */
const initialState = (): ExportedProjectsState => ({items: load()});

export const exportedProjectsSlice = createSlice({
  name: 'exportedProjects',
  initialState,
  reducers: {
    projectExported(state, action: PayloadAction<ExportedProjectRecord>) {
      state.items.push(action.payload);
    },
    exportedProjectRemoved(state, action: PayloadAction<string>) {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
  },
});

export const {projectExported, exportedProjectRemoved} = exportedProjectsSlice.actions;

/** Selector typed structurally so this file needn't import the store (avoids a cycle). */
export const selectExportedProjects = (state: {exportedProjects: ExportedProjectsState}) =>
  state.exportedProjects.items;

/** Writes the list through to storage; the store calls this when it changes. */
export function persistExportedProjects(items: ExportedProjectRecord[]): void {
  Storage.setItemSync(STORAGE_KEY, JSON.stringify(items));
}
