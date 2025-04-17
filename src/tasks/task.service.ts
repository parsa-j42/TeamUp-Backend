import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { CreateTaskDto, UpdateTaskDto, AssignTaskDto } from './dto/task.dto';
import { MilestoneService } from '@milestones/milestone.service'; // To check milestone access
import { UserService } from '@users/user.service'; // To validate assignee exists
import { ProjectService } from '@projects/project.service'; // To check project membership for assignee
import { User } from '@users/user.entity'; // For type hint

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly milestoneService: MilestoneService, // To check parent milestone access
    private readonly userService: UserService, // To find assignee user
    private readonly projectService: ProjectService, // To check if assignee is project member
  ) {}

  // Helper to check if user can access the milestone (and thus its tasks)
  // Returns the projectId associated with the milestone
  private async checkMilestonePermission(
    milestoneId: string,
    userId: string,
  ): Promise<string> {
    // This will throw ForbiddenException if user cannot access milestone
    const milestone = await this.milestoneService.findOne(milestoneId, userId);
    return milestone.projectId; // Return projectId for further checks if needed
  }

  async findAllByMilestoneId(
    milestoneId: string,
    userId: string,
  ): Promise<Task[]> {
    await this.checkMilestonePermission(milestoneId, userId); // Check permission first
    return this.taskRepository.find({
      where: { milestoneId },
      order: { createdAt: 'ASC' }, // Default order
      relations: ['assignee'], // Load assignee details for DTO mapping
    });
  }

  async findOne(
    taskId: string,
    userId: string,
    relations: string[] = [],
  ): Promise<Task> {
    // Ensure 'milestone' relation is loaded for permission check
    const requiredRelations = new Set([...relations, 'milestone', 'assignee']);
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: Array.from(requiredRelations),
    });

    if (!task) {
      throw new NotFoundException(`Task with ID "${taskId}" not found.`);
    }
    // Check permission via the task's milestone
    await this.checkMilestonePermission(task.milestoneId, userId);
    return task;
  }

  async create(
    milestoneId: string,
    createDto: CreateTaskDto,
    userId: string,
  ): Promise<Task> {
    const projectId = await this.checkMilestonePermission(milestoneId, userId); // Check permission and get projectId

    // Optional: Validate assigneeId if provided
    let assignee: User | null = null;
    if (createDto.assigneeId) {
      assignee = await this.userService.findOne(createDto.assigneeId); // Throws if not found
      // Optional: Check if assignee is a member of the project
      const project = await this.projectService.findOne(projectId, [
        'memberships',
      ]);
      if (!project.memberships.some((m) => m.userId === createDto.assigneeId)) {
        throw new BadRequestException(
          `User ${assignee.firstName} is not a member of this project and cannot be assigned tasks.`,
        );
      }
    }

    const task = this.taskRepository.create({
      ...createDto,
      milestoneId: milestoneId,
      assigneeId: assignee ? assignee.id : null, // Ensure assigneeId is set correctly
    });

    try {
      const savedTask = await this.taskRepository.save(task);
      // Reload assignee relation if it was set, for the response DTO
      if (assignee) {
        savedTask.assignee = assignee;
      }
      return savedTask;
    } catch (error) {
      console.error(`Error creating task for milestone ${milestoneId}:`, error);
      throw new InternalServerErrorException('Failed to create task.');
    }
  }

  async update(
    taskId: string,
    updateDto: UpdateTaskDto,
    userId: string,
  ): Promise<Task> {
    // findOne checks existence and permission, loads milestone relation
    const task = await this.findOne(taskId, userId);
    const projectId = task.milestone.projectId; // Get projectId from loaded relation

    // Optional: Validate assigneeId if provided and changed
    let assignee: User | null | undefined = undefined; // undefined means not changed/checked
    if (
      updateDto.assigneeId !== undefined &&
      updateDto.assigneeId !== task.assigneeId
    ) {
      if (updateDto.assigneeId === null) {
        assignee = null; // Unassigning
      } else {
        assignee = await this.userService.findOne(updateDto.assigneeId); // Throws if not found
        // Optional: Check if assignee is a member of the project
        const project = await this.projectService.findOne(projectId, [
          'memberships',
        ]);
        if (
          !project.memberships.some((m) => m.userId === updateDto.assigneeId)
        ) {
          throw new BadRequestException(
            `User ${assignee.firstName} is not a member of this project and cannot be assigned tasks.`,
          );
        }
      }
    }

    Object.assign(task, updateDto);
    // Ensure assigneeId is correctly set if assignee object was determined
    if (assignee !== undefined) {
      task.assigneeId = assignee ? assignee.id : null;
    }

    try {
      const updatedTask = await this.taskRepository.save(task);
      // Reload relations if needed for response (findOne does this)
      return this.findOne(updatedTask.id, userId, ['assignee']);
    } catch (error) {
      console.error(`Error updating task ${taskId}:`, error);
      throw new InternalServerErrorException('Failed to update task.');
    }
  }

  async assign(
    taskId: string,
    assignDto: AssignTaskDto,
    userId: string,
  ): Promise<Task> {
    // Use the update logic for assignment, passing only the assigneeId field
    return this.update(taskId, { assigneeId: assignDto.assigneeId }, userId);
  }

  async remove(taskId: string, userId: string): Promise<void> {
    // findOne checks existence and permission
    const task = await this.findOne(taskId, userId);

    const result = await this.taskRepository.delete(task.id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Task with ID "${taskId}" could not be deleted.`,
      );
    }
  }
}
