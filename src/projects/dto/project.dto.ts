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

// --- DTO for Milestone data within CreateProjectDto ---
class CreateMilestoneInputDto {
  @ApiProperty({
    description: 'Title of the milestone',
    example: 'Initial Design Phase',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Date of the milestone (ISO 8601 format)',
    example: '2025-01-15T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  // 'active' status usually determined later, not at creation typically
  // @ApiPropertyOptional({ description: 'Is this the initially active milestone?', default: false })
  // @IsOptional()
  // @IsBoolean()
  // active?: boolean;
}
// --- End Milestone Input DTO ---

class BaseProjectDto {
  @ApiProperty({ description: 'Title of the project' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;
  @ApiProperty({ description: 'Detailed description of the project' })
  @IsString()
  @IsNotEmpty()
  description: string;
  @ApiPropertyOptional({
    description: 'Estimated number of members (e.g., 2-4, 10+)',
  })
  @IsOptional()
  @IsString()
  numOfMembers?: string;
  @ApiPropertyOptional({
    description: 'Type of project (e.g., remote, hybrid)',
  })
  @IsOptional()
  @IsString()
  projectType?: string;
  @ApiPropertyOptional({
    description: 'Mentor request status (e.g., looking, open)',
  })
  @IsOptional()
  @IsString()
  mentorRequest?: string;
  @ApiPropertyOptional({
    description: 'Preferred mentor interaction (e.g., one-time, regular)',
  })
  @IsOptional()
  @IsString()
  preferredMentor?: string;
  @ApiPropertyOptional({ description: 'List of required skill names' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  requiredSkills?: string[];
  @ApiPropertyOptional({ description: 'List of project tags/keywords' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  tags?: string[];
  @ApiPropertyOptional({ description: 'Description of required roles' })
  @IsOptional()
  @IsString()
  requiredRoles?: string;
  @ApiPropertyOptional({ description: 'URL for the project image' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
  @ApiPropertyOptional({ description: 'Project start date (ISO 8601 format)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;
  @ApiPropertyOptional({ description: 'Project end date (ISO 8601 format)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CreateProjectDto extends BaseProjectDto {
  // --- ADDED: Optional array of milestones ---
  @ApiPropertyOptional({
    description: 'Initial milestones for the project',
    type: [CreateMilestoneInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMilestoneInputDto)
  milestones?: CreateMilestoneInputDto[];
  // --- END ADDED ---
}

export class UpdateProjectDto extends PartialType(BaseProjectDto) {}

export class ProjectDto extends BaseProjectDto {
  @ApiProperty({ description: 'Project ID (UUID)' }) @IsUUID() id: string;
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
  members: ProjectMemberDto[];
  @ApiPropertyOptional({
    type: () => [MilestoneDto],
    description: 'Project milestones',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones?: MilestoneDto[];
  @ApiProperty({ description: 'Creation Timestamp' }) createdAt: Date;
  @ApiProperty({ description: 'Last Update Timestamp' }) updatedAt: Date;
}

export class FindProjectsQueryDto {
  @ApiPropertyOptional({
    description: 'Number of items to skip for pagination',
    type: Number,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
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
