import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ApplicationService } from './application.service';
import {
  CreateApplicationDto,
  UpdateApplicationStatusDto,
  FindApplicationsQueryDto,
  ApplicationDto,
} from './dto/application.dto';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@users/user.entity';
import { Application } from './application.entity';
import { UserDto } from '@users/dto/user.dto';
import { ProjectDto } from '@projects/dto/project.dto';

@ApiTags('applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications') // Base route for applications
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  // Endpoint to apply to a project
  @Post('/apply/:projectId')
  @ApiOperation({ summary: 'Apply to a specific project' })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project to apply to',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'Application submitted successfully',
    type: ApplicationDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., already member)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 409, description: 'Conflict (Already applied)' })
  async applyToProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createDto: CreateApplicationDto, // Body might be empty or contain role/message
    @CurrentUser() user: User,
  ): Promise<ApplicationDto> {
    const application = await this.applicationService.create(
      projectId,
      user,
      createDto,
    );
    return this.mapApplicationToDto(application);
  }

  @Get()
  @ApiOperation({ summary: 'Find applications (sent/received/filtered)' })
  @ApiQuery({ type: FindApplicationsQueryDto })
  @ApiResponse({
    status: 200,
    description: 'List of applications and total count',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (Invalid filter combination)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (Trying to access restricted data)',
  })
  async findAll(
    @Query() query: FindApplicationsQueryDto,
    @CurrentUser() user: User,
  ): Promise<{ applications: ApplicationDto[]; total: number }> {
    const { applications, total } = await this.applicationService.findAll(
      query,
      user,
    );
    return {
      applications: applications.map((app) => this.mapApplicationToDto(app)),
      total,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific application by ID' })
  @ApiParam({
    name: 'id',
    description: 'Application ID (UUID)',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Application details',
    type: ApplicationDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (Not applicant or project owner)',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ApplicationDto> {
    // Service checks permission
    const application = await this.applicationService.findOne(id, user.id);
    return this.mapApplicationToDto(application);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Accept or decline an application (Project Owner only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Application ID (UUID)',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Application status updated',
    type: ApplicationDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., already decided)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (Not project owner)' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  @ApiResponse({
    status: 500,
    description: 'Internal error (e.g., failed to add member)',
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateApplicationStatusDto,
    @CurrentUser() user: User,
  ): Promise<ApplicationDto> {
    // Service checks permission and handles adding member on accept
    const application = await this.applicationService.updateStatus(
      id,
      updateStatusDto,
      user.id,
    );
    // Re-fetch to ensure relations are loaded for DTO mapping after potential membership add
    const updatedApp = await this.applicationService.findOne(
      application.id,
      user.id,
    );
    return this.mapApplicationToDto(updatedApp);
  }

  // --- DTO Mapping Helper ---
  private mapApplicationToDto(app: Application): ApplicationDto {
    const applicantDto: Omit<UserDto, 'cognitoSub' | 'profile'> | null =
      app.applicant
        ? {
            id: app.applicant.id,
            email: app.applicant.email,
            firstName: app.applicant.firstName,
            lastName: app.applicant.lastName,
            preferredUsername: app.applicant.preferredUsername,
            createdAt: app.applicant.createdAt,
            updatedAt: app.applicant.updatedAt,
          }
        : null;

    // Map project using simplified fields
    const projectDto: Omit<
      ProjectDto,
      'owner' | 'members' | 'milestones'
    > | null = app.project
      ? {
          id: app.project.id,
          title: app.project.title,
          description: app.project.description,
          numOfMembers: app.project.numOfMembers,
          projectType: app.project.projectType,
          mentorRequest: app.project.mentorRequest,
          preferredMentor: app.project.preferredMentor,
          requiredSkills: app.project.requiredSkills,
          tags: app.project.tags,
          requiredRoles: app.project.requiredRoles,
          imageUrl: app.project.imageUrl,
          startDate: app.project.startDate?.toISOString(),
          endDate: app.project.endDate?.toISOString(),
          createdAt: app.project.createdAt,
          updatedAt: app.project.updatedAt,
        }
      : null;

    return {
      id: app.id,
      applicant: applicantDto!, // Assert non-null if relation is always loaded
      applicantId: app.applicantId,
      project: projectDto!, // Assert non-null if relation is always loaded
      projectId: app.projectId,
      status: app.status,
      roleAppliedFor: app.roleAppliedFor,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  }
}
