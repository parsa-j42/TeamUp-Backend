import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  IsArray,
} from 'class-validator';

// Base DTO for create/update payload
class BasePortfolioProjectDto {
  @ApiProperty({
    description: 'Title of the portfolio project',
    example: 'Personal Blog Site',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Description of the portfolio project',
    example: 'Built with React and deployed on Vercel.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Tags associated with the project',
    example: ['React', 'Blog', 'Frontend'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'URL of the project image (managed externally)',
  })
  @IsOptional()
  @IsString() // Add IsUrl() validation if needed
  imageUrl?: string;

  // Add other fields like projectUrl if needed
}

// DTO for creating a new portfolio project
export class CreatePortfolioProjectDto extends BasePortfolioProjectDto {}

// DTO for updating an existing portfolio project
export class UpdatePortfolioProjectDto extends PartialType(
  BasePortfolioProjectDto,
) {}

// DTO for representing a portfolio project in responses
export class PortfolioProjectDto extends BasePortfolioProjectDto {
  @ApiProperty({ description: 'Portfolio Project ID (UUID)' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Associated Profile ID (UUID)' })
  @IsUUID()
  profileId: string;

  @ApiProperty({ description: 'Creation Timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last Update Timestamp' })
  updatedAt: Date;
}
