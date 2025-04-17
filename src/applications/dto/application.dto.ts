import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { ApplicationStatus } from '@common/enums/application-status.enum';
import { UserDto } from '@users/dto/user.dto';
import { ProjectDto } from '@projects/dto/project.dto';
import { Type } from 'class-transformer';

// DTO for creating an application (user applies to a project)
export class CreateApplicationDto {
  // projectId is taken from the route parameter
  // applicantId is taken from the CurrentUser

  @ApiPropertyOptional({
    description: 'Optional: Role the user is applying for',
    example: 'Frontend Developer',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  roleAppliedFor?: string;

  @ApiPropertyOptional({ description: 'Optional: Cover letter or message' })
  @IsOptional()
  @IsString()
  message?: string; // Add if needed later
}

// DTO for updating the status (by project owner)
export class UpdateApplicationStatusDto {
  @ApiProperty({
    description: 'New status for the application',
    enum: [ApplicationStatus.ACCEPTED, ApplicationStatus.DECLINED],
  })
  @IsEnum([ApplicationStatus.ACCEPTED, ApplicationStatus.DECLINED]) // Only allow accept/decline via this DTO
  @IsNotEmpty()
  status: ApplicationStatus.ACCEPTED | ApplicationStatus.DECLINED;
}

// DTO for representing an application in responses
export class ApplicationDto {
  @ApiProperty({ description: 'Application ID (UUID)' })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Applicant User Details',
    type: () => OmitType(UserDto, ['cognitoSub', 'profile'] as const),
  })
  @Type(() => OmitType(UserDto, ['cognitoSub', 'profile'] as const))
  applicant: Omit<UserDto, 'cognitoSub' | 'profile'>;

  @ApiProperty({ description: 'Applicant User ID (UUID)' })
  @IsUUID()
  applicantId: string;

  // Include simplified project details
  @ApiProperty({
    description: 'Project Details',
    type: () =>
      OmitType(ProjectDto, ['owner', 'members', 'milestones'] as const),
  })
  @Type(() => OmitType(ProjectDto, ['owner', 'members', 'milestones'] as const))
  project: Omit<ProjectDto, 'owner' | 'members' | 'milestones'>;

  @ApiProperty({ description: 'Project ID (UUID)' })
  @IsUUID()
  projectId: string;

  @ApiProperty({
    description: 'Current status of the application',
    enum: ApplicationStatus,
  })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @ApiPropertyOptional({ description: 'Role the user applied for' })
  @IsOptional()
  @IsString()
  roleAppliedFor?: string;

  @ApiProperty({ description: 'Timestamp when application was created' })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when application was last updated (status change)',
  })
  updatedAt: Date;
}

// DTO for query parameters when finding applications
export class FindApplicationsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by project ID',
    type: 'string',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Filter by applicant ID (use "me" for current user)',
    example: 'me',
  })
  @IsOptional()
  @IsString() // Allow 'me' or UUID
  applicantId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ApplicationStatus,
    example: ApplicationStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({
    description: 'Filter type: "sent" or "received" (relative to current user)',
    enum: ['sent', 'received'],
    example: 'received',
  })
  @IsOptional()
  @IsEnum(['sent', 'received'])
  filter?: 'sent' | 'received'; // Used with applicantId='me' or inferred current user

  @ApiPropertyOptional({
    description: 'Number of items to skip',
    type: Number,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  skip?: number;

  @ApiPropertyOptional({
    description: 'Number of items to take',
    type: Number,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  take?: number;
}
