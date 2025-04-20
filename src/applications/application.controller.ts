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
import { SimpleUserDto } from '@users/dto/user.dto';

@ApiTags('applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications')
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
    @Body() createDto: CreateApplicationDto,
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
    const application = await this.applicationService.updateStatus(
      id,
      updateStatusDto,
      user.id,
    );
    const updatedApp = await this.applicationService.findOne(
      application.id,
      user.id,
    );
    return this.mapApplicationToDto(updatedApp);
  }

  // --- DTO Mapping Helper ---
  private mapApplicationToDto(app: Application): ApplicationDto {
    // Map applicant to SimpleUserDto
    const applicantDto: SimpleUserDto | null = app.applicant
      ? {
          id: app.applicant.id,
          firstName: app.applicant.firstName,
          lastName: app.applicant.lastName,
          preferredUsername: app.applicant.preferredUsername,
        }
      : null;

    // Map project owner to SimpleUserDto
    const ownerDto: SimpleUserDto | null =
      app.project && app.project.owner
        ? {
            id: app.project.owner.id,
            firstName: app.project.owner.firstName,
            lastName: app.project.owner.lastName,
            preferredUsername: app.project.owner.preferredUsername,
          }
        : null;

    // Map project using simplified fields, including the owner
    // Ensure the structure matches the explicit ApplicationProjectDto definition
    const projectDto = app.project
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
          owner: ownerDto!, // Assert owner is non-null as project requires an owner
        }
      : null;

    // Construct the final ApplicationDto
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
