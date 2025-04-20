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
import { TaskDto } from '@tasks/dto/task.dto';
import { Task } from '@tasks/task.entity';
import { UserDto } from '@users/dto/user.dto';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/milestones')
export class MilestoneController {
  constructor(private readonly milestoneService: MilestoneService) {}

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
    const updatedMilestone = await this.milestoneService.findOne(
      milestone.id,
      user.id,
      ['tasks', 'tasks.assignee'],
    );
    return this.mapMilestoneToDto(updatedMilestone);
  }

  // --- NEW Activate Endpoint ---
  @Patch(':milestoneId/activate')
  @ApiOperation({
    summary: 'Set a specific milestone as active for the project',
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project',
    type: 'string',
  })
  @ApiParam({
    name: 'milestoneId',
    description: 'ID of the milestone to activate',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Milestone activated',
    type: MilestoneDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Project or Milestone not found' })
  async activate(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @CurrentUser() user: User,
  ): Promise<MilestoneDto> {
    const activatedMilestone = await this.milestoneService.activateMilestone(
      milestoneId,
      projectId,
      user.id,
    );
    // Re-fetch with tasks for the response DTO
    const fullMilestone = await this.milestoneService.findOne(
      activatedMilestone.id,
      user.id,
      ['tasks', 'tasks.assignee'],
    );
    return this.mapMilestoneToDto(fullMilestone);
  }
  // --- END Activate Endpoint ---

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
      date: milestone.date.toISOString(),
      active: milestone.active,
      createdAt: milestone.createdAt,
      tasks: milestone.tasks?.map((t) => this.mapTaskToDto(t)) || [],
    };
  }

  // --- DTO Mapping Helper for Task ---
  private mapTaskToDto(task: Task): TaskDto {
    const assigneeDto: Omit<UserDto, 'cognitoSub' | 'profile'> | null =
      task.assignee
        ? {
            id: task.assignee.id,
            email: task.assignee.email, // Keep email if needed, otherwise remove
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
