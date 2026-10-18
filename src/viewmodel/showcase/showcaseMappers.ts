import type {SectionDTO} from '../../model/showcase/types';
import type {Section, Video} from './types';

/**
 * DTO → domain mappers. Pure functions, no React and no Redux.
 *
 * Today the DTO and domain shapes line up closely; keeping an explicit mapper
 * means backend shape changes are absorbed here rather than rippling into views.
 */

function mapVideo(dto: {id: string; url: string}): Video {
  return {id: dto.id, url: dto.url};
}

export function mapSection(dto: SectionDTO): Section {
  return {
    id: dto.id,
    title: dto.title,
    videos: dto.videos.map(mapVideo),
  };
}

export function mapSections(dtos: SectionDTO[]): Section[] {
  return dtos.map(mapSection);
}
