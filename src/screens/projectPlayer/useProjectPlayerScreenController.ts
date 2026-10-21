import {useCallback} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import {useProjectsViewModel} from '../../viewmodel/projects/useProjectsViewModel';

/** Declared locally (a `type`, so it satisfies ParamListBase) — screens may not import app/. */
type ProjectPlayerParamList = {
  ProjectPlayer: {id: string};
};

/** Full-screen playback of one exported project, with close and delete. */
export function useProjectPlayerScreenController() {
  const {id} = useRoute<RouteProp<ProjectPlayerParamList, 'ProjectPlayer'>>().params;
  const navigation = useNavigation();
  const {projects, remove} = useProjectsViewModel();
  const project = projects.find(p => p.id === id) ?? null;

  const onClose = useCallback(() => navigation.goBack(), [navigation]);

  const onDelete = useCallback(() => {
    Alert.alert('Delete project?', 'It stays in your photo library.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          navigation.goBack();
          remove(id);
        },
      },
    ]);
  }, [navigation, remove, id]);

  return {
    uri: project?.uri ?? null,
    title: project ? `${project.dateLabel} · ${project.durationLabel}` : '',
    onClose,
    onDelete,
  };
}
