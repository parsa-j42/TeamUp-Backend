import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioProject } from './portfolio-project.entity';
import {
  CreatePortfolioProjectDto,
  UpdatePortfolioProjectDto,
} from './dto/portfolio-project.dto';

@Injectable()
export class PortfolioProjectService {
  constructor(
    @InjectRepository(PortfolioProject)
    private readonly projectRepository: Repository<PortfolioProject>,
    // No need to inject ProfileService here usually, access control is done via profileId
  ) {}

  /**
   * Finds all portfolio projects for a given profile ID.
   */
  async findByProfileId(profileId: string): Promise<PortfolioProject[]> {
    return this.projectRepository.find({
      where: { profileId },
      order: { createdAt: 'DESC' }, // Example order
    });
  }

  /**
   * Finds a single portfolio project by its ID.
   * Ensures it belongs to the specified profile ID for authorization.
   */
  async findOneByIdAndProfileId(
    id: string,
    profileId: string,
  ): Promise<PortfolioProject> {
    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(
        `Portfolio Project with ID "${id}" not found.`,
      );
    }
    if (project.profileId !== profileId) {
      throw new ForbiddenException(
        'You do not have permission to access this portfolio project.',
      );
    }
    return project;
  }

  /**
   * Creates a new portfolio project associated with a profile.
   */
  async createForProfile(
    profileId: string,
    dto: CreatePortfolioProjectDto,
  ): Promise<PortfolioProject> {
    const project = this.projectRepository.create({
      ...dto,
      tags: dto.tags || [], // Ensure tags is an array
      profileId: profileId,
    });

    try {
      return await this.projectRepository.save(project);
    } catch (error) {
      console.error(
        `Error creating portfolio project for profile ${profileId}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to create portfolio project.',
      );
    }
  }

  /**
   * Updates an existing portfolio project.
   * Ensures the project belongs to the correct profile before updating.
   */
  async update(
    id: string,
    profileId: string,
    dto: UpdatePortfolioProjectDto,
  ): Promise<PortfolioProject> {
    // findOne checks existence and ownership
    const project = await this.findOneByIdAndProfileId(id, profileId);

    // Apply updates, ensuring tags are handled correctly
    const { tags, ...otherUpdates } = dto;
    Object.assign(project, otherUpdates);
    if (tags !== undefined) {
      project.tags = tags ?? []; // Replace tags array
    }

    try {
      return await this.projectRepository.save(project);
    } catch (error) {
      console.error(
        `Error updating portfolio project ${id} for profile ${profileId}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to update portfolio project.',
      );
    }
  }

  /**
   * Deletes a portfolio project.
   * Ensures the project belongs to the correct profile before deleting.
   */
  async remove(id: string, profileId: string): Promise<void> {
    // findOne checks existence and ownership
    await this.findOneByIdAndProfileId(id, profileId);

    const result = await this.projectRepository.delete({ id, profileId }); // Use composite key for safety

    if (result.affected === 0) {
      console.warn(
        `Attempted to delete portfolio project ${id} for profile ${profileId}, but it was not found (result.affected === 0).`,
      );
      throw new NotFoundException(
        `Portfolio Project with ID "${id}" could not be deleted or was already deleted.`,
      );
    }
  }
}
