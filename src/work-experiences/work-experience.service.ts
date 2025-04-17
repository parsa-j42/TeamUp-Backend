import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkExperience } from './work-experience.entity';
import {
  CreateWorkExperienceDto,
  UpdateWorkExperienceDto,
} from './dto/work-experience.dto';
// import { UserProfile } from '@profiles/profile.entity'; // Needed for type checking

@Injectable()
export class WorkExperienceService {
  constructor(
    @InjectRepository(WorkExperience)
    private readonly experienceRepository: Repository<WorkExperience>,
  ) {}

  /**
   * Finds all work experiences for a given profile ID.
   */
  async findByProfileId(profileId: string): Promise<WorkExperience[]> {
    return this.experienceRepository.find({
      where: { profileId },
      order: {
        /* Add ordering if needed, e.g., by date range parsing or a dedicated date field */
      },
    });
  }

  /**
   * Finds a single work experience by its ID.
   * Ensures it belongs to the specified profile ID.
   * Throws NotFoundException or ForbiddenException.
   */
  async findOneByIdAndProfileId(
    id: string,
    profileId: string,
  ): Promise<WorkExperience> {
    const experience = await this.experienceRepository.findOne({
      where: { id },
    }); // Find by ID first
    if (!experience) {
      throw new NotFoundException(`Work Experience with ID "${id}" not found.`);
    }
    // Now check if it belongs to the correct profile
    if (experience.profileId !== profileId) {
      throw new ForbiddenException(
        'You do not have permission to access this work experience.',
      );
    }
    return experience;
  }

  /**
   * Creates a new work experience associated with a profile.
   */
  async createForProfile(
    profileId: string,
    dto: CreateWorkExperienceDto,
  ): Promise<WorkExperience> {
    const experience = this.experienceRepository.create({
      ...dto,
      profileId: profileId, // Explicitly set the profileId
    });

    try {
      return await this.experienceRepository.save(experience);
    } catch (error) {
      console.error(
        `Error creating work experience for profile ${profileId}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to create work experience.',
      );
    }
  }

  /**
   * Updates an existing work experience.
   * Ensures the experience belongs to the correct profile before updating.
   */
  async update(
    id: string,
    profileId: string,
    dto: UpdateWorkExperienceDto,
  ): Promise<WorkExperience> {
    // Find the specific experience ensuring it belongs to the profile
    // This method throws NotFound or Forbidden if checks fail
    const experience = await this.findOneByIdAndProfileId(id, profileId);

    // Apply updates from dto
    Object.assign(experience, dto);

    try {
      return await this.experienceRepository.save(experience);
    } catch (error) {
      console.error(
        `Error updating work experience ${id} for profile ${profileId}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to update work experience.',
      );
    }
  }

  /**
   * Deletes a work experience.
   * Ensures the experience belongs to the correct profile before deleting.
   */
  async remove(id: string, profileId: string): Promise<void> {
    // Find the specific experience ensuring it belongs to the profile
    // This also handles the ForbiddenException / NotFoundException
    await this.findOneByIdAndProfileId(id, profileId);

    // Proceed with deletion
    const result = await this.experienceRepository.delete({ id, profileId }); // Use composite key for safety

    // This check might be redundant because findOneByIdAndProfileId already confirmed existence & ownership,
    // but kept for robustness against race conditions.
    if (result.affected === 0) {
      // This could happen if deleted between findOne and delete call in a race condition
      console.warn(
        `Attempted to delete work experience ${id} for profile ${profileId}, but it was not found (result.affected === 0).`,
      );
      throw new NotFoundException(
        `Work Experience with ID "${id}" could not be deleted or was already deleted.`,
      );
    }
  }
}
