import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsDateString,
  IsArray,
} from 'class-validator';
import { ApplicationStatus } from '@common/enums/application-status.enum';
import { Type } from 'class-transformer';
import { SimpleUserDto } from '@users/dto/user.dto';

// DTO for creating an application (user applies to a project)
export class CreateApplicationDto {
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
  message?: string;
}

// DTO for updating the status (by project owner)
export class UpdateApplicationStatusDto {
  @ApiProperty({
    description: 'New status for the application',
    enum: [ApplicationStatus.ACCEPTED, ApplicationStatus.DECLINED],
  })
  @IsEnum([ApplicationStatus.ACCEPTED, ApplicationStatus.DECLINED])
  @IsNotEmpty()
  status: ApplicationStatus.ACCEPTED | ApplicationStatus.DECLINED;
}

// --- Define the specific type for the nested project ---
// Explicitly define fields needed, including owner as SimpleUserDto
class ApplicationProjectDto {
  @ApiProperty({ description: 'Project ID (UUID)' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Title of the project' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed description of the project' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Estimated number of members' })
  @IsOptional()
  @IsString()
  numOfMembers?: string;

  @ApiPropertyOptional({ description: 'Type of project' })
  @IsOptional()
  @IsString()
  projectType?: string;

  @ApiPropertyOptional({ description: 'Mentor request status' })
  @IsOptional()
  @IsString()
  mentorRequest?: string;

  @ApiPropertyOptional({ description: 'Preferred mentor interaction' })
  @IsOptional()
  @IsString()
  preferredMentor?: string;

  @ApiPropertyOptional({ description: 'List of required skill names' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @ApiPropertyOptional({ description: 'List of project tags/keywords' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
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

  @ApiProperty({ description: 'Creation Timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last Update Timestamp' })
  updatedAt: Date;

  // Define owner explicitly with SimpleUserDto type
  @ApiProperty({ type: () => SimpleUserDto })
  @Type(() => SimpleUserDto)
  owner: SimpleUserDto;
}
// --- End nested project type definition ---

// DTO for representing an application in responses
export class ApplicationDto {
  @ApiProperty({ description: 'Application ID (UUID)' })
  @IsUUID()
  id: string;

  // Use SimpleUserDto for applicant
  @ApiProperty({
    description: 'Applicant User Details',
    type: () => SimpleUserDto,
  })
  @Type(() => SimpleUserDto)
  applicant: SimpleUserDto;

  @ApiProperty({ description: 'Applicant User ID (UUID)' })
  @IsUUID()
  applicantId: string;

  // Use the explicitly defined ApplicationProjectDto
  @ApiProperty({
    description: 'Project Details (including owner)',
    type: () => ApplicationProjectDto,
  })
  @Type(() => ApplicationProjectDto)
  project: ApplicationProjectDto;

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
  @IsString()
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
    description: 'Filter type: "sent" or "received"',
    enum: ['sent', 'received'],
    example: 'received',
  })
  @IsOptional()
  @IsEnum(['sent', 'received'])
  filter?: 'sent' | 'received';

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
