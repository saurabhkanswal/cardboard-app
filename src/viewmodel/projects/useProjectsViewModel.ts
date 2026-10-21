import {useCallback, useMemo} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {deleteExport, exportUri} from '../../model/export/exportFiles';
import {
  exportedProjectRemoved,
  selectExportedProjects,
} from '../../model/export/exportedProjectsSlice';
import {mapExportedProjects} from './projectsMappers';
import type {ExportedProject} from './types';

export interface ProjectsViewModel {
  /** Newest first. */
  projects: ExportedProject[];
  /** Deletes the kept file and forgets the project (the copy in Photos stays). */
  remove: (id: string) => void;
}

/** Feature ViewModel for "Your projects": the exports kept on this device. */
export function useProjectsViewModel(): ProjectsViewModel {
  const records = useSelector(selectExportedProjects);
  const dispatch = useDispatch();

  const projects = useMemo(() => mapExportedProjects(records, exportUri), [records]);

  const remove = useCallback(
    (id: string) => {
      const record = records.find(r => r.id === id);
      if (record) {
        deleteExport(record.fileName);
      }
      dispatch(exportedProjectRemoved(id));
    },
    [records, dispatch],
  );

  return {projects, remove};
}
