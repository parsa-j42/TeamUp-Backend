import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkillService } from './skill.service';
import { SkillDto } from './dto/skill.dto';
import { Skill } from './skill.entity';

@ApiTags('skills')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillService: SkillService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available skills' })
  @ApiResponse({
    status: 200,
    description: 'List of all skills',
    type: [SkillDto],
  })
  async findAll(): Promise<SkillDto[]> {
    const skills = await this.skillService.findAll();
    // Map entities to DTOs
    return skills.map(this.mapSkillToDto);
  }

  // --- DTO Mapping Helper ---
  private mapSkillToDto(skill: Skill): SkillDto {
    return {
      id: skill.id,
      name: skill.name,
      description: skill.description,
    };
  }

  // Add POST, PATCH, DELETE later if admin management is needed
}