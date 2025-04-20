import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { ProjectService } from './project.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  FindProjectsQueryDto,
  ProjectDto,
} from './dto/project.dto';
import {
  AddMemberDto,
  UpdateMemberRoleDto,
  ProjectMemberDto,
} from './dto/project-membership.dto';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@users/user.entity';
import { ApplicationService } from '@applications/application.service';
import { InviteUserDto } from '@applications/dto/invite-user.dto';
import { ApplicationDto } from '@applications/dto/application.dto';

@ApiTags('projects')
@Controller('projects')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly applicationService: ApplicationService, // Inject ApplicationService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    type: ProjectDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request (Validation Error)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: User,
  ): Promise<ProjectDto> {
    const project = await this.projectService.createProject(
      createProjectDto,
      user,
    );
    return this.projectService.mapProjectToDto(project);
  }

  @Get()
  @ApiOperation({
    summary: 'Find all projects (publicly accessible, filterable)',
  })
  @ApiQuery({ type: FindProjectsQueryDto })
  @ApiResponse({ status: 200, description: 'List of projects and total count' })
  async findAll(
    @Query() query: FindProjectsQueryDto,
  ): Promise<{ projects: ProjectDto[]; total: number }> {
    const { projects, total } = await this.projectService.findAll(query);
    return {
      projects: projects.map((p) => this.projectService.mapProjectToDto(p)),
      total,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get projects associated with the current user (owned or member)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user projects',
    type: [ProjectDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMyProjects(@CurrentUser() user: User): Promise<ProjectDto[]> {
    const { projects: userProjects } = await this.projectService.findAll({
      memberId: user.id,
      take: 1000,
    });
    const fullProjects = await Promise.all(
      userProjects.map((project) => this.projectService.findOne(project.id)),
    );
    return fullProjects.map((project) =>
      this.projectService.mapProjectToDto(project),
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific project by ID (incl. members, milestones, tasks)',
  })
  @ApiParam({ name: 'id', description: 'Project ID (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Project details',
    type: ProjectDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectDto> {
    const project = await this.projectService.findOne(id);
    return this.projectService.mapProjectToDto(project);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a project (Owner only)' })
  @ApiParam({ name: 'id', description: 'Project ID (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
    type: ProjectDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: User,
  ): Promise<ProjectDto> {
    const updatedProject = await this.projectService.updateProject(
      id,
      updateProjectDto,
      user.id,
    );
    return this.projectService.mapProjectToDto(updatedProject);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project (Owner only)' })
  @ApiParam({ name: 'id', description: 'Project ID (UUID)', type: 'string' })
  @ApiResponse({ status: 204, description: 'Project deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.projectService.deleteProject(id, user.id);
  }

  // --- Membership Endpoints (Nested under /projects/:id/members) ---

  @Post(':id/members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a member directly to a project (Owner only)' }) // Clarified purpose
  @ApiParam({ name: 'id', description: 'Project ID (UUID)', type: 'string' })
  @ApiResponse({
    status: 201,
    description: 'Member added successfully',
    type: ProjectMemberDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (User already member, invalid role, etc.)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (Not owner)' })
  @ApiResponse({ status: 404, description: 'Project or User not found' })
  async addMember(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() addMemberDto: AddMemberDto,
    @CurrentUser() user: User,
  ): Promise<ProjectMemberDto> {
    const membership = await this.projectService.addMember(
      projectId,
      addMemberDto,
      user.id,
    );
    return this.projectService.mapMembershipToDto(membership);
  }

  // --- NEW Invite Endpoint ---
  @Post(':id/invite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite a user to join a project (Owner only)' })
  @ApiParam({ name: 'id', description: 'Project ID (UUID)', type: 'string' })
  @ApiResponse({
    status: 201,
    description: 'Invitation sent successfully (Application created)',
    type: ApplicationDto,
  }) // Return ApplicationDto
  @ApiResponse({
    status: 400,
    description: 'Bad Request (User already member/invited)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (Not owner)' })
  @ApiResponse({
    status: 404,
    description: 'Project or User to invite not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict (Invitation/Application already exists)',
  })
  async inviteUser(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() inviteDto: InviteUserDto,
    @CurrentUser() user: User,
  ): Promise<ApplicationDto> {
    // Return ApplicationDto
    const application = await this.applicationService.inviteUser(
      projectId,
      inviteDto,
      user.id,
    );
    // Need to map Application to ApplicationDto (similar to ApplicationController)
    // For simplicity, we might just return the core info or re-fetch and map fully.
    // Let's return a simplified version for now.
    return {
      id: application.id,
      applicantId: application.applicantId,
      projectId: application.projectId,
      status: application.status,
      roleAppliedFor: application.roleAppliedFor,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      // Include simplified applicant and project if needed, requires loading relations in service
      applicant: {
        id: application.applicant.id,
        firstName: application.applicant.firstName,
        lastName: application.applicant.lastName,
        preferredUsername: application.applicant.preferredUsername,
      },
      project: {
        id: application.project.id,
        title: application.project.title,
        description: application.project.description, // Add other fields as needed by ApplicationProjectDto
        owner: {
          // Map owner
          id: application.project.owner.id,
          firstName: application.project.owner.firstName,
          lastName: application.project.owner.lastName,
          preferredUsername: application.project.owner.preferredUsername,
        },
        createdAt: application.project.createdAt,
        updatedAt: application.project.updatedAt,
        // Add other required fields from ApplicationProjectDto
        numOfMembers: application.project.numOfMembers,
        projectType: application.project.projectType,
        mentorRequest: application.project.mentorRequest,
        preferredMentor: application.project.preferredMentor,
        requiredSkills: application.project.requiredSkills,
        tags: application.project.tags,
        requiredRoles: application.project.requiredRoles,
        imageUrl: application.project.imageUrl,
        startDate: application.project.startDate?.toISOString(),
        endDate: application.project.endDate?.toISOString(),
      },
    };
  }
  // --- END Invite Endpoint ---

  @Patch(':id/members/:memberUserId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a member's role (Owner only)" })
  @ApiParam({ name: 'id', description: 'Project ID (UUID)', type: 'string' })
  @ApiParam({
    name: 'memberUserId',
    description: 'User ID of the member to update',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Member role updated successfully',
    type: ProjectMemberDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (Invalid role change)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (Not owner)' })
  @ApiResponse({ status: 404, description: 'Project or Membership not found' })
  async updateMemberRole(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('memberUserId', ParseUUIDPipe) memberUserId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
    @CurrentUser() user: User,
  ): Promise<ProjectMemberDto> {
    const membership = await this.projectService.updateMemberRole(
      projectId,
      memberUserId,
      updateRoleDto,
      user.id,
    );
    return this.projectService.mapMembershipToDto(membership);
  }

  @Delete(':id/members/:memberUserId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from a project (Owner or self)' })
  @ApiParam({ name: 'id', description: 'Project ID (UUID)', type: 'string' })
  @ApiParam({
    name: 'memberUserId',
    description: 'User ID of the member to remove',
    type: 'string',
  })
  @ApiResponse({ status: 204, description: 'Member removed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (Cannot remove only owner)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (Permission denied)' })
  @ApiResponse({ status: 404, description: 'Project or Membership not found' })
  async removeMember(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('memberUserId', ParseUUIDPipe) memberUserId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.projectService.removeMember(projectId, memberUserId, user.id);
  }
}
