import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TaskService } from './task.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  AssignTaskDto,
  TaskDto,
} from './dto/task.dto';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@users/user.entity';
import { Task } from './task.entity';
// import { OmitType } from '@nestjs/swagger'; // For mapping assignee
import { UserDto } from '@users/dto/user.dto'; // For mapping assignee

@ApiTags('projects') // Group under projects
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
// Nested route under milestones
@Controller('projects/:projectId/milestones/:milestoneId/tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tasks for a specific milestone' })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project',
    type: 'string',
  })
  @ApiParam({
    name: 'milestoneId',
    description: 'ID of the milestone',
    type: 'string',
  })
  @ApiResponse({ status: 200, description: 'List of tasks', type: [TaskDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Project or Milestone not found' })
  async findAll(
    @Param('projectId') _projectId: string, // Keep for route consistency, but service uses milestoneId
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @CurrentUser() user: User,
  ): Promise<TaskDto[]> {
    // Service checks permission via milestoneId
    const tasks = await this.taskService.findAllByMilestoneId(
      milestoneId,
      user.id,
    );
    return tasks.map((t) => this.mapTaskToDto(t));
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task for a milestone' })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project',
    type: 'string',
  })
  @ApiParam({
    name: 'milestoneId',
    description: 'ID of the milestone',
    type: 'string',
  })
  @ApiResponse({ status: 201, description: 'Task created', type: TaskDto })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., invalid assignee)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 404,
    description: 'Project, Milestone or Assignee User not found',
  })
  async create(
    @Param('projectId') _projectId: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body() createDto: CreateTaskDto,
    @CurrentUser() user: User,
  ): Promise<TaskDto> {
    // Service checks permission via milestoneId
    const task = await this.taskService.create(milestoneId, createDto, user.id);
    return this.mapTaskToDto(task);
  }

  @Get(':taskId')
  @ApiOperation({ summary: 'Get a specific task by ID' })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project',
    type: 'string',
  })
  @ApiParam({
    name: 'milestoneId',
    description: 'ID of the milestone',
    type: 'string',
  })
  @ApiParam({ name: 'taskId', description: 'ID of the task', type: 'string' })
  @ApiResponse({ status: 200, description: 'Task details', type: TaskDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 404,
    description: 'Project, Milestone or Task not found',
  })
  async findOne(
    @Param('projectId') _projectId: string,
    @Param('milestoneId') _milestoneId: string, // Keep for route consistency
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: User,
  ): Promise<TaskDto> {
    // Service checks permission via taskId -> milestoneId
    const task = await this.taskService.findOne(taskId, user.id, ['assignee']); // Load assignee
    return this.mapTaskToDto(task);
  }

  @Patch(':taskId')
  @ApiOperation({ summary: 'Update a specific task' })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project',
    type: 'string',
  })
  @ApiParam({
    name: 'milestoneId',
    description: 'ID of the milestone',
    type: 'string',
  })
  @ApiParam({ name: 'taskId', description: 'ID of the task', type: 'string' })
  @ApiResponse({ status: 200, description: 'Task updated', type: TaskDto })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., invalid assignee)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 404,
    description: 'Not Found (Project/Milestone/Task/Assignee User)',
  })
  async update(
    @Param('projectId') _projectId: string,
    @Param('milestoneId') _milestoneId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() updateDto: UpdateTaskDto,
    @CurrentUser() user: User,
  ): Promise<TaskDto> {
    // Service checks permission via taskId -> milestoneId
    const task = await this.taskService.update(taskId, updateDto, user.id);
    return this.mapTaskToDto(task);
  }

  // Specific endpoint for assignment might be cleaner
  @Patch(':taskId/assign')
  @ApiOperation({ summary: 'Assign or unassign a task' })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project',
    type: 'string',
  })
  @ApiParam({
    name: 'milestoneId',
    description: 'ID of the milestone',
    type: 'string',
  })
  @ApiParam({ name: 'taskId', description: 'ID of the task', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Task assignment updated',
    type: TaskDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (Assignee not project member)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 404,
    description: 'Not Found (Project/Milestone/Task/Assignee User)',
  })
  async assignTask(
    @Param('projectId') _projectId: string,
    @Param('milestoneId') _milestoneId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() assignDto: AssignTaskDto,
    @CurrentUser() user: User,
  ): Promise<TaskDto> {
    // Service checks permission via taskId -> milestoneId
    const task = await this.taskService.assign(taskId, assignDto, user.id);
    return this.mapTaskToDto(task);
  }

  @Delete(':taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a specific task' })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project',
    type: 'string',
  })
  @ApiParam({
    name: 'milestoneId',
    description: 'ID of the milestone',
    type: 'string',
  })
  @ApiParam({ name: 'taskId', description: 'ID of the task', type: 'string' })
  @ApiResponse({ status: 204, description: 'Task deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 404,
    description: 'Project, Milestone or Task not found',
  })
  async remove(
    @Param('projectId') _projectId: string,
    @Param('milestoneId') _milestoneId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    // Service checks permission via taskId -> milestoneId
    await this.taskService.remove(taskId, user.id);
  }

  // --- DTO Mapping Helper ---
  private mapTaskToDto(task: Task): TaskDto {
    const assigneeDto: Omit<UserDto, 'cognitoSub' | 'profile'> | null =
      task.assignee
        ? {
            id: task.assignee.id,
            email: task.assignee.email,
            firstName: task.assignee.firstName,
            lastName: task.assignee.lastName,
            preferredUsername: task.assignee.preferredUsername,
            createdAt: task.assignee.createdAt,
            updatedAt: task.assignee.updatedAt,
          }
        : null;

    return {
      id: task.id,
      milestoneId: task.milestoneId,
      name: task.name,
      description: task.description,
      status: task.status,
      assigneeId: task.assigneeId,
      assignee: assigneeDto,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
