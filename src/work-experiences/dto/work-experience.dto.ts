import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsUUID, IsNotEmpty, MaxLength } from 'class-validator';

// Base DTO for core fields
class BaseWorkExperienceDto {
  @ApiProperty({
    description: 'Date range for the experience (e.g., May 2021 - Dec 2022)',
    example: 'May 2021 - Dec 2022',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  dateRange: string;

  @ApiProperty({
    description: 'Name of the work or position',
    example: 'Software Developer Intern',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  workName: string;

  @ApiProperty({
    description: 'Description of the experience',
    example:
      'Developed features for the main application using React and Node.js.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;
}

// DTO for representing a work experience in responses
export class WorkExperienceDto extends BaseWorkExperienceDto {
  @ApiProperty({ description: 'Work Experience ID (UUID)' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Associated Profile ID (UUID)' })
  @IsUUID()
  profileId: string;
}

// DTO for creating a new work experience (profileId will be inferred from context)
export class CreateWorkExperienceDto extends BaseWorkExperienceDto {}

// DTO for updating an existing work experience (all fields optional)
export class UpdateWorkExperienceDto extends PartialType(
  BaseWorkExperienceDto,
) {}
