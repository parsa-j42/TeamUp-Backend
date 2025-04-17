import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  OmitType,
} from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsNotEmpty,
  MaxLength,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserDto } from '@users/dto/user.dto';
import { ProjectMemberDto } from './project-membership.dto';
import { MilestoneDto } from '@milestones/dto/milestone.dto';

// Base DTO with common fields from Create/Update
class BaseProjectDto {
  @ApiProperty({
    description: 'Title of the project',
    example: 'Community Garden App',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Detailed description of the project',
    example:
      'An application to connect local gardeners and manage community garden plots.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Estimated number of members (e.g., 2-4, 10+)',
    example: '2-4',
  })
  @IsOptional()
  @IsString()
  numOfMembers?: string;

  @ApiPropertyOptional({
    description: 'Type of project (e.g., remote, hybrid)',
    example: 'Hybrid',
  })
  @IsOptional()
  @IsString() // Could be enum if values are fixed
  projectType?: string;

  @ApiPropertyOptional({
    description: 'Mentor request status (e.g., looking, open)',
    example: 'Looking for a Mentor',
  })
  @IsOptional()
  @IsString() // Could be enum
  mentorRequest?: string;

  @ApiPropertyOptional({
    description: 'Preferred mentor interaction (e.g., one-time, regular)',
    example: 'Regular Meetings',
  })
  @IsOptional()
  @IsString() // Could be enum
  preferredMentor?: string;

  @ApiPropertyOptional({
    description: 'List of required skill names',
    example: ['React', 'Node.js', 'PostgreSQL'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  requiredSkills?: string[];

  @ApiPropertyOptional({
    description: 'List of project tags/keywords',
    example: ['Community', 'Gardening', 'Mobile App'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Description of required roles',
    example: 'Looking for a UI/UX designer and a backend developer.',
  })
  @IsOptional()
  @IsString()
  requiredRoles?: string;

  @ApiPropertyOptional({ description: 'URL for the project image' })
  @IsOptional()
  @IsString() // Add IsUrl() if validation is strict
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Project start date (ISO 8601 format)',
    example: '2024-09-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string; // Receive as string, transform/validate as Date in service if needed

  @ApiPropertyOptional({
    description: 'Project end date (ISO 8601 format)',
    example: '2025-03-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// DTO for creating a new project
export class CreateProjectDto extends BaseProjectDto {}

// DTO for updating an existing project
export class UpdateProjectDto extends PartialType(BaseProjectDto) {}

// DTO for representing a project in responses
// Includes owner and member details
export class ProjectDto extends BaseProjectDto {
  @ApiProperty({ description: 'Project ID (UUID)' })
  @IsUUID()
  id: string;

  // Use OmitType to exclude sensitive fields like cognitoSub from owner DTO
  @ApiProperty({
    description: 'Project Owner Details',
    type: () => OmitType(UserDto, ['cognitoSub', 'profile'] as const),
  })
  @ValidateNested()
  @Type(() => OmitType(UserDto, ['cognitoSub', 'profile'] as const))
  owner: Omit<UserDto, 'cognitoSub' | 'profile'>;

  @ApiProperty({
    description: 'List of project members and their roles',
    type: [ProjectMemberDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectMemberDto)
  members: ProjectMemberDto[]; // Combined from memberships

  @ApiPropertyOptional({
    type: () => [MilestoneDto],
    description: 'Project milestones',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones?: MilestoneDto[];

  @ApiProperty({ description: 'Creation Timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last Update Timestamp' })
  updatedAt: Date;

  // Add applications, bookmarks later if needed in this specific DTO
}

// DTO for query parameters when finding projects
export class FindProjectsQueryDto {
  @ApiPropertyOptional({
    description: 'Number of items to skip for pagination',
    type: Number,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number) // Transform query param string to number
  skip?: number;

  @ApiPropertyOptional({
    description: 'Number of items to take for pagination',
    type: Number,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  take?: number;

  @ApiPropertyOptional({
    description: 'Search term for project title or description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by owner user ID',
    type: 'string',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by member user ID',
    type: 'string',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @ApiPropertyOptional({
    description: 'Filter by required skill name',
    example: 'Figma',
  })
  @IsOptional()
  @IsString()
  skill?: string;

  @ApiPropertyOptional({ description: 'Filter by tag name', example: 'Remote' })
  @IsOptional()
  @IsString()
  tag?: string;
}
