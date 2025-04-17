import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsNotEmpty } from 'class-validator';

export class SkillDto {
  @ApiProperty({ description: 'Skill ID (UUID)' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Name of the skill', example: 'React' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Optional description of the skill',
    example: 'Building user interfaces with React library.',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

// DTO for creating a skill (e.g., by an admin, or implicitly via profile update)
export class CreateSkillDto {
  @ApiProperty({ description: 'Name of the skill', example: 'Node.js' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Optional description of the skill' })
  @IsOptional()
  @IsString()
  description?: string;
}

// DTO for updating a skill (e.g., adding/changing description via profile edit modal)
export class UpdateSkillDto extends PartialType(CreateSkillDto) {}
