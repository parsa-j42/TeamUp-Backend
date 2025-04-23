import { ApiProperty } from '@nestjs/swagger';
import { ProjectDto } from '@projects/dto/project.dto';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RecommendedProjectDto {
  @ApiProperty({ type: () => ProjectDto })
  @ValidateNested()
  @Type(() => ProjectDto)
  project: ProjectDto;

  @ApiProperty({
    description: 'Keywords explaining the reason for recommendation (1-2 words each)',
    example: ['React Skill', 'Design Interest'],
  })
  @IsArray()
  @IsString({ each: true })
  reasons: string[];
}