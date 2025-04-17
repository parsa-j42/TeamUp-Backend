import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  IsBoolean,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { TaskDto } from '@tasks/dto/task.dto';
import { Type } from 'class-transformer';

// Base DTO for common fields
class BaseMilestoneDto {
  @ApiProperty({
    description: 'Title of the milestone',
    example: 'Phase 1 Completion',
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
  date: string; // Receive as string

  @ApiPropertyOptional({
    description:
      'Whether this milestone is currently active in the UI timeline',
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

// DTO for creating a milestone
export class CreateMilestoneDto extends BaseMilestoneDto {}

// DTO for updating a milestone
export class UpdateMilestoneDto extends PartialType(BaseMilestoneDto) {}

// DTO for representing a milestone in responses
export class MilestoneDto extends BaseMilestoneDto {
  @ApiProperty({ description: 'Milestone ID (UUID)' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Associated Project ID (UUID)' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Creation Timestamp' })
  createdAt: Date;

  // Optionally include tasks associated with this milestone
  @ApiPropertyOptional({
    type: () => [TaskDto],
    description: 'Tasks within this milestone',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  tasks?: TaskDto[];
}
