import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Milestone } from './milestone.entity';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';
import { ProjectService } from '@projects/project.service'; // To check project membership/ownership

@Injectable()
export class MilestoneService {
  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    // Inject ProjectService or MembershipRepository to check permissions
    private readonly projectService: ProjectService,
  ) {}

  // Helper to check if user is member/owner of the project associated with the milestone
  private async checkProjectPermission(
    projectId: string,
    userId: string,
  ): Promise<void> {
    // Fetch project with memberships to check if user is part of it
    // Only load necessary relations for the check
    const project = await this.projectService.findOne(projectId, [
      'owner',
      'memberships',
    ]);
    const isOwner = project.ownerId === userId;
    const isMember = project.memberships.some((m) => m.userId === userId);

    // Define who can manage milestones (e.g., owner or any member)
    // Let's assume any member can manage milestones for now
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
    await this.checkProjectPermission(projectId, userId); // Check permission first
    return this.milestoneRepository.find({
      where: { projectId },
      order: { date: 'ASC' }, // Order milestones chronologically
      relations: ['tasks', 'tasks.assignee'], // Load tasks and their assignees
    });
  }

  async findOne(
    milestoneId: string,
    userId: string,
    relations: string[] = [],
  ): Promise<Milestone> {
    // Ensure 'project' relation is loaded for permission check if not already included
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
    // Check permission using the projectId from the found milestone
    await this.checkProjectPermission(milestone.projectId, userId);
    return milestone;
  }

  async create(
    projectId: string,
    createDto: CreateMilestoneDto,
    userId: string,
  ): Promise<Milestone> {
    await this.checkProjectPermission(projectId, userId); // Check permission

    // Convert date string to Date object
    const date = new Date(createDto.date);
    if (isNaN(date.getTime())) {
      throw new InternalServerErrorException(
        'Invalid date format provided for milestone.',
      );
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
    // findOne checks existence and permission
    const milestone = await this.findOne(milestoneId, userId);

    // Convert date string if provided
    if (updateDto.date) {
      const newDate = new Date(updateDto.date);
      if (isNaN(newDate.getTime())) {
        throw new InternalServerErrorException(
          'Invalid date format provided for milestone update.',
        );
      }

      // Fix: Use a properly typed approach instead of type casting to any
      const updatedMilestone = {
        ...updateDto,
        date: newDate,
      };

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
    // findOne checks existence and permission
    const milestone = await this.findOne(milestoneId, userId);

    // Deletion will cascade to tasks due to onDelete: 'CASCADE' in Task entity
    const result = await this.milestoneRepository.delete(milestone.id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Milestone with ID "${milestoneId}" could not be deleted.`,
      );
    }
  }
}
