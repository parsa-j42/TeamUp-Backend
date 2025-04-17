import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsUrl,
  MaxLength,
  IsArray,
  IsNotEmpty,
  ArrayMinSize,
} from 'class-validator';
import { SkillDto } from '@skills/dto/skill.dto';
import { InterestDto } from '@interests/dto/interest.dto';
import { WorkExperienceDto } from '@work-experiences/dto/work-experience.dto';

// Base DTO for profile data
export class BaseProfileDto {
  @ApiPropertyOptional({ description: 'Type of user (e.g., Student, Alumni)' })
  @IsOptional()
  @IsString()
  userType?: string;

  @ApiPropertyOptional({ description: 'Academic program' })
  @IsOptional()
  @IsString()
  program?: string;

  @ApiPropertyOptional({ description: 'Experience summary from signup' })
  @IsOptional()
  @IsString()
  @MaxLength(500) // Example length limit
  signupExperience?: string;

  @ApiPropertyOptional({ description: 'Current status (e.g., Undergraduate)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Institution name' })
  @IsOptional()
  @IsString()
  institution?: string;

  @ApiPropertyOptional({ description: 'User biography' })
  @IsOptional()
  @IsString()
  @MaxLength(1000) // Example length limit
  bio?: string;

  @ApiPropertyOptional({ description: 'URL for avatar image' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'URL for banner image' })
  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  // --- Fields for updating relations by name ---
  @ApiPropertyOptional({
    description:
      'List of skill names to associate with the profile. Replaces existing skills.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true }) // Ensure skill names are not empty strings
  skillNames?: string[]; // Renamed from skills to skillNames

  @ApiPropertyOptional({
    description:
      'List of interest names to associate with the profile. Replaces existing interests.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true }) // Ensure interest names are not empty strings
  interestNames?: string[]; // Renamed from interests to interestNames
  // --------------------------------------------
}

// DTO for the full profile response
export class UserProfileDto extends BaseProfileDto {
  @ApiProperty({ description: 'Profile ID (UUID)' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Associated User ID (UUID)' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Last Update Timestamp' })
  updatedAt: Date;

  // --- Include related items in response ---
  @ApiPropertyOptional({
    type: () => [SkillDto],
    description: 'Associated skills',
  })
  skills?: SkillDto[];

  @ApiPropertyOptional({
    type: () => [InterestDto],
    description: 'Associated interests',
  })
  interests?: InterestDto[];

  @ApiPropertyOptional({
    type: () => [WorkExperienceDto],
    description: 'Associated work experiences',
  })
  workExperiences?: WorkExperienceDto[];
  // -----------------------------------------
}

// DTO for updating the profile (most fields are optional)
export class UpdateProfileDto extends PartialType(BaseProfileDto) {
  @ApiPropertyOptional({ description: 'First Name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last Name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  // Override skillNames/interestNames from BaseProfileDto to match old field names for API compatibility
  @ApiPropertyOptional({
    description: 'List of skill names. If provided, replaces existing skills.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  skills?: string[];

  @ApiPropertyOptional({
    description:
      'List of interest names. If provided, replaces existing interests.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  interests?: string[];
}

// DTO specifically for data coming from SignUpPage steps 1 & 2
export class CompleteSignupProfileDto {
  @ApiProperty({ description: 'Type of user' })
  @IsString()
  @IsNotEmpty()
  userType: string;

  @ApiProperty({ description: 'Academic program' })
  @IsString()
  @IsNotEmpty()
  program: string;

  @ApiProperty({ description: 'Experience summary from signup' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  signupExperience: string;

  @ApiProperty({ description: 'List of interest names' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @IsNotEmpty({ each: true })
  interests: string[];

  @ApiProperty({ description: 'List of skill names' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @IsNotEmpty({ each: true })
  skills: string[];
}
