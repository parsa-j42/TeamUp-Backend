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
import { MilestoneService } from './milestone.service';
import {
  CreateMilestoneDto,
  UpdateMilestoneDto,
  MilestoneDto,
} from './dto/milestone.dto';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@users/user.entity';
import { Milestone } from './milestone.entity';
import { TaskDto } from '@tasks/dto/task.dto'; // For mapping tasks
import { Task } from '@tasks/task.entity'; // For mapping tasks
// import { OmitType } from '@nestjs/swagger'; // For mapping tasks
import { UserDto } from '@users/dto/user.dto'; // For mapping tasks

@ApiTags('projects') // Group under projects
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/milestones') // Nested route
export class MilestoneController {
  constructor(
    private readonly milestoneService: MilestoneService,
    // TaskService not strictly needed here if MilestoneService loads tasks
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all milestones for a specific project' })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'List of milestones',
    type: [MilestoneDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: User,
  ): Promise<MilestoneDto[]> {
    // Service checks permission and loads tasks
    const milestones = await this.milestoneService.findAllByProjectId(
      projectId,
      user.id,
    );
    return milestones.map((m) => this.mapMilestoneToDto(m));
  }

  @Post()
  @ApiOperation({ summary: 'Create a new milestone for a project' })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'Milestone created',
    type: MilestoneDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createDto: CreateMilestoneDto,
    @CurrentUser() user: User,
  ): Promise<MilestoneDto> {
    const milestone = await this.milestoneService.create(
      projectId,
      createDto,
      user.id,
    );
    return this.mapMilestoneToDto(milestone);
  }

  @Get(':milestoneId')
  @ApiOperation({ summary: 'Get a specific milestone by ID' })
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
  @ApiResponse({
    status: 200,
    description: 'Milestone details',
    type: MilestoneDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Project or Milestone not found' })
  async findOne(
    @Param('projectId') _projectId: string, // Keep projectId for route consistency
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @CurrentUser() user: User,
  ): Promise<MilestoneDto> {
    // Load tasks relation for the DTO response
    const milestone = await this.milestoneService.findOne(
      milestoneId,
      user.id,
      ['tasks', 'tasks.assignee'],
    );
    return this.mapMilestoneToDto(milestone);
  }

  @Patch(':milestoneId')
  @ApiOperation({ summary: 'Update a specific milestone' })
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
  @ApiResponse({
    status: 200,
    description: 'Milestone updated',
    type: MilestoneDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Project or Milestone not found' })
  async update(
    @Param('projectId') _projectId: string, // Keep projectId
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body() updateDto: UpdateMilestoneDto,
    @CurrentUser() user: User,
  ): Promise<MilestoneDto> {
    const milestone = await this.milestoneService.update(
      milestoneId,
      updateDto,
      user.id,
    );
    // Re-fetch with relations for consistent response DTO
    const updatedMilestone = await this.milestoneService.findOne(
      milestone.id,
      user.id,
      ['tasks', 'tasks.assignee'],
    );
    return this.mapMilestoneToDto(updatedMilestone);
  }

  @Delete(':milestoneId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a specific milestone' })
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
  @ApiResponse({ status: 204, description: 'Milestone deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Project or Milestone not found' })
  async remove(
    @Param('projectId') _projectId: string, // Keep projectId
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.milestoneService.remove(milestoneId, user.id);
  }

  // --- DTO Mapping Helper ---
  private mapMilestoneToDto(milestone: Milestone): MilestoneDto {
    return {
      id: milestone.id,
      projectId: milestone.projectId,
      title: milestone.title,
      date: milestone.date.toISOString(), // Convert Date to ISO string
      active: milestone.active,
      createdAt: milestone.createdAt,
      // Map tasks if loaded
      tasks: milestone.tasks?.map((t) => this.mapTaskToDto(t)) || [],
    };
  }

  // --- DTO Mapping Helper for Task ---
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
