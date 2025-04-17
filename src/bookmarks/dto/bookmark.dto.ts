import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { ProjectDto } from '@projects/dto/project.dto';
import { Type } from 'class-transformer';

// DTO for representing a bookmark in responses (e.g., list of bookmarked projects)
export class BookmarkDto {
  @ApiProperty({ description: 'Bookmark ID (UUID)' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'User ID who created the bookmark' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Project ID that was bookmarked' })
  @IsUUID()
  projectId: string;

  // Include simplified project details when listing bookmarks
  @ApiProperty({
    description: 'Bookmarked Project Details',
    type: () => OmitType(ProjectDto, ['members', 'milestones'] as const),
  })
  @Type(() => OmitType(ProjectDto, ['members', 'milestones'] as const))
  project: Omit<ProjectDto, 'members' | 'milestones'>;

  @ApiProperty({ description: 'Timestamp when bookmark was created' })
  createdAt: Date;
}
