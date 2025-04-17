import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, QueryFailedError } from 'typeorm';
import { Skill } from './skill.entity';
import { CreateSkillDto, UpdateSkillDto } from './dto/skill.dto';

@Injectable()
export class SkillService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
  ) {}

  async findAll(): Promise<Skill[]> {
    return this.skillRepository.find();
  }

  async findOne(id: string): Promise<Skill> {
    const skill = await this.skillRepository.findOne({ where: { id } });
    if (!skill) {
      throw new NotFoundException(`Skill with ID "${id}" not found`);
    }
    return skill;
  }

  async findByName(name: string): Promise<Skill | null> {
    // Case-insensitive find might be better here depending on requirements
    // e.g., using .where('LOWER(skill.name) = LOWER(:name)', { name })
    return this.skillRepository.findOne({ where: { name } });
  }

  /**
   * Finds existing skills by name or creates new ones if they don't exist.
   * Returns the array of Skill entities corresponding to the names.
   * Used when updating profile skills.
   * Handles potential race conditions during creation.
   */
  async findOrCreateByName(names: string[]): Promise<Skill[]> {
    if (!names || names.length === 0) {
      return [];
    }

    // Normalize names (trim, filter empty, ensure unique, maybe lowercase)
    const uniqueNames = [
      ...new Set(names.map((name) => name.trim()).filter(Boolean)),
    ];
    if (uniqueNames.length === 0) {
      return [];
    }

    // Find existing skills matching the normalized names
    // Consider case-insensitivity: .where('LOWER(skill.name) IN (:...names)', { names: uniqueNames.map(n => n.toLowerCase()) })
    const existingSkills = await this.skillRepository.find({
      where: { name: In(uniqueNames) },
    });

    const existingSkillNames = new Set(existingSkills.map((s) => s.name)); // Use the names as found in DB
    // Determine which names are new (case-sensitive comparison for now)
    const newSkillNames = uniqueNames.filter(
      (name) => !existingSkillNames.has(name),
    );

    const newSkills: Skill[] = [];
    if (newSkillNames.length > 0) {
      const skillEntities = newSkillNames.map(
        (name) => this.skillRepository.create({ name }), // Create entities without saving yet
      );
      try {
        // Save all new skills at once
        const savedNewSkills = await this.skillRepository.save(skillEntities);
        newSkills.push(...savedNewSkills);
      } catch (error) {
        // Handle potential race condition or other save errors
        if (
          error instanceof QueryFailedError &&
          (error as QueryFailedError & { code?: string }).code === '23505'
        ) {
          // Unique constraint violation likely means another request created it concurrently
          console.warn(
            `Conflict saving new skills (names: ${newSkillNames.join(', ')}), likely race condition. Re-fetching.`,
          );
          // Re-fetch all required skills to ensure consistency
          return this.skillRepository.find({
            where: { name: In(uniqueNames) },
          });
        }
        console.error('Error saving new skills:', error);
        throw new InternalServerErrorException('Failed to create new skills.');
      }
    }

    return [...existingSkills, ...newSkills];
  }

  // --- Admin/Management Endpoints (Optional based on requirements) ---

  async create(createSkillDto: CreateSkillDto): Promise<Skill> {
    const normalizedName = createSkillDto.name.trim();
    if (!normalizedName) {
      throw new ConflictException('Skill name cannot be empty.');
    }
    const existing = await this.findByName(normalizedName); // Check normalized name
    if (existing) {
      throw new ConflictException(
        `Skill with name "${normalizedName}" already exists.`,
      );
    }
    const skill = this.skillRepository.create({
      ...createSkillDto,
      name: normalizedName,
    });
    try {
      return await this.skillRepository.save(skill);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { code?: string }).code === '23505'
      ) {
        throw new ConflictException(
          `Skill with name "${normalizedName}" already exists (concurrent creation).`,
        );
      }
      console.error('Error creating skill:', error);
      throw new InternalServerErrorException('Failed to create skill.');
    }
  }

  async update(id: string, updateSkillDto: UpdateSkillDto): Promise<Skill> {
    const skill = await this.findOne(id); // Ensure skill exists

    const normalizedNewName = updateSkillDto.name?.trim();

    // Check if name is being changed and if the new name already exists
    if (normalizedNewName && normalizedNewName !== skill.name) {
      const existing = await this.findByName(normalizedNewName);
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Skill with name "${normalizedNewName}" already exists.`,
        );
      }
      // Update the name in the DTO to the normalized version
      updateSkillDto.name = normalizedNewName;
    } else if (updateSkillDto.name !== undefined && !normalizedNewName) {
      // Prevent updating name to an empty string
      throw new ConflictException('Skill name cannot be empty.');
    }

    Object.assign(skill, updateSkillDto);
    try {
      return await this.skillRepository.save(skill);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { code?: string }).code === '23505'
      ) {
        throw new ConflictException(`Skill name conflict during update.`);
      }
      console.error(`Error updating skill ${id}:`, error);
      throw new InternalServerErrorException('Failed to update skill.');
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.skillRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Skill with ID "${id}" not found`);
    }
  }
}
