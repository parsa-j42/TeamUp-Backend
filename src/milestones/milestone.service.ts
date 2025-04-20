import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Milestone } from './milestone.entity';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';
import { ProjectService } from '@projects/project.service';

@Injectable()
export class MilestoneService {
  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    private readonly projectService: ProjectService,
    private readonly entityManager: EntityManager, // Inject EntityManager
  ) {}

  // Helper to check if user is member/owner of the project associated with the milestone
  private async checkProjectPermission(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const project = await this.projectService.findOne(projectId, [
      'owner',
      'memberships',
    ]);
    const isOwner = project.ownerId === userId;
    const isMember = project.memberships.some((m) => m.userId === userId);

    if (!isOwner && !isMember) {
      throw new ForbiddenException(
        'You do not have permission to manage milestones for this project.',
      );
    }
  }

  async findAllByProjectId(
    projectId: string,
    userId: string,
  ): Promise<Milestone[]> {
    await this.checkProjectPermission(projectId, userId);
    return this.milestoneRepository.find({
      where: { projectId },
      order: { date: 'ASC' },
      relations: ['tasks', 'tasks.assignee'],
    });
  }

  async findOne(
    milestoneId: string,
    userId: string,
    relations: string[] = [],
  ): Promise<Milestone> {
    const requiredRelations = new Set([...relations, 'project']);
    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId },
      relations: Array.from(requiredRelations),
    });

    if (!milestone) {
      throw new NotFoundException(
        `Milestone with ID "${milestoneId}" not found.`,
      );
    }
    await this.checkProjectPermission(milestone.projectId, userId);
    return milestone;
  }

  async create(
    projectId: string,
    createDto: CreateMilestoneDto,
    userId: string,
  ): Promise<Milestone> {
    await this.checkProjectPermission(projectId, userId);

    const date = new Date(createDto.date);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(
        'Invalid date format provided for milestone.',
      ); // Changed exception type
    }

    const milestone = this.milestoneRepository.create({
      ...createDto,
      date: date,
      projectId: projectId,
    });

    try {
      return await this.milestoneRepository.save(milestone);
    } catch (error) {
      console.error(
        `Error creating milestone for project ${projectId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to create milestone.');
    }
  }

  async update(
    milestoneId: string,
    updateDto: UpdateMilestoneDto,
    userId: string,
  ): Promise<Milestone> {
    const milestone = await this.findOne(milestoneId, userId);

    if (updateDto.date) {
      const newDate = new Date(updateDto.date);
      if (isNaN(newDate.getTime())) {
        throw new BadRequestException(
          'Invalid date format provided for milestone update.',
        ); // Changed exception type
      }
      const updatedMilestone = { ...updateDto, date: newDate };
      Object.assign(milestone, updatedMilestone);
    } else {
      Object.assign(milestone, updateDto);
    }

    try {
      return await this.milestoneRepository.save(milestone);
    } catch (error) {
      console.error(`Error updating milestone ${milestoneId}:`, error);
      throw new InternalServerErrorException('Failed to update milestone.');
    }
  }

  async remove(milestoneId: string, userId: string): Promise<void> {
    const milestone = await this.findOne(milestoneId, userId);
    const result = await this.milestoneRepository.delete(milestone.id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Milestone with ID "${milestoneId}" could not be deleted.`,
      );
    }
  }

  // --- NEW METHOD: Activate Milestone ---
  async activateMilestone(
    milestoneId: string,
    projectId: string,
    userId: string,
  ): Promise<Milestone> {
    // 1. Check permission (user must be member/owner of the project)
    await this.checkProjectPermission(projectId, userId);

    // 2. Find the target milestone to ensure it exists and belongs to the project
    const targetMilestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId, projectId: projectId },
    });
    if (!targetMilestone) {
      throw new NotFoundException(
        `Milestone with ID "${milestoneId}" not found in project "${projectId}".`,
      );
    }

    // 3. Use a transaction to ensure atomicity (optional but recommended)
    return await this.entityManager
      .transaction(async (transactionalEntityManager) => {
        // Deactivate all other milestones in the same project
        await transactionalEntityManager.update(
          Milestone,
          { projectId: projectId, id: Not(milestoneId) }, // Use Not() operator if available or query builder
          { active: false },
        );

        // Activate the target milestone
        targetMilestone.active = true;
        const activatedMilestone = await transactionalEntityManager.save(
          Milestone,
          targetMilestone,
        );

        // Optionally reload relations if needed for the response DTO
        // For now, just return the updated milestone entity
        return activatedMilestone;
      })
      .catch((error) => {
        console.error(
          `Error activating milestone ${milestoneId} for project ${projectId}:`,
          error,
        );
        throw new InternalServerErrorException('Failed to activate milestone.');
      });

    /* --- Non-transactional approach (simpler, less safe for concurrency) ---
    // Deactivate all other milestones
    await this.milestoneRepository.update(
        { projectId: projectId, id: Not(milestoneId) }, // Or use query builder if Not() isn't available
        { active: false }
    );
    // Activate the target milestone
    targetMilestone.active = true;
    try {
        return await this.milestoneRepository.save(targetMilestone);
    } catch (error) {
        console.error(`Error activating milestone ${milestoneId} for project ${projectId}:`, error);
        throw new InternalServerErrorException('Failed to activate milestone.');
    }
    */
  }
  // --- END NEW METHOD ---
}

// Helper function for Not operator (if not directly available in TypeORM version)
import { FindOperator, FindOperatorType } from 'typeorm';
class NotOperator<T> extends FindOperator<T> {
  constructor(value: T | FindOperator<T>) {
    super('not', value as any); // Type assertion might be needed
  }
  get type(): FindOperatorType {
    return 'not';
  } // Explicitly define type getter
}
export function Not<T>(value: T | FindOperator<T>): FindOperator<T> {
  return new NotOperator(value);
}
