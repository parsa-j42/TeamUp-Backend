import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Application } from './application.entity';
import {
  CreateApplicationDto,
  UpdateApplicationStatusDto,
  FindApplicationsQueryDto,
} from './dto/application.dto';
import { User } from '@users/user.entity';
import { ProjectService } from '@projects/project.service'; // To check project owner/members
import { ProjectMembership } from '@projects/project-membership.entity'; // To add member on accept
import { ProjectRole } from '@common/enums/project-role.enum'; // For adding member
import { ApplicationStatus } from '@common/enums/application-status.enum';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly projectService: ProjectService,
    @InjectRepository(ProjectMembership) // Inject membership repo to add members
    private readonly membershipRepository: Repository<ProjectMembership>,
  ) {}

  async create(
    projectId: string,
    applicant: User,
    createDto: CreateApplicationDto,
  ): Promise<Application> {
    // Check if project exists (throws NotFoundException if not)
    const project = await this.projectService.findOne(projectId, [
      'owner',
      'memberships',
    ]); // Load owner/memberships

    // Check if user is already a member or owner
    if (
      project.ownerId === applicant.id ||
      project.memberships.some((m) => m.userId === applicant.id)
    ) {
      throw new BadRequestException(
        'You are already a member or the owner of this project.',
      );
    }

    // Check if application already exists (handled by unique index, but good practice)
    const existingApplication = await this.applicationRepository.findOne({
      where: { projectId, applicantId: applicant.id },
    });
    if (existingApplication) {
      throw new ConflictException('You have already applied to this project.');
    }

    const application = this.applicationRepository.create({
      ...createDto,
      projectId: projectId,
      applicantId: applicant.id,
      status: ApplicationStatus.PENDING, // Explicitly set status
    });

    try {
      const savedApp = await this.applicationRepository.save(application);
      // Reload relations for response DTO mapping if needed
      return this.findOne(savedApp.id, applicant.id); // Pass applicantId for permission check
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        error.message.includes('applications_applicantId_projectId_idx')
      ) {
        throw new ConflictException(
          'You have already applied to this project (concurrent request).',
        );
      }
      console.error(
        `Error creating application for user ${applicant.id} to project ${projectId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to submit application.');
    }
  }

  async findAll(
    queryDto: FindApplicationsQueryDto,
    currentUser: User,
  ): Promise<{ applications: Application[]; total: number }> {
    const {
      skip = 0,
      take = 10,
      projectId,
      applicantId,
      status,
      filter,
    } = queryDto;

    const query = this.applicationRepository
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.applicant', 'applicant')
      .leftJoinAndSelect('app.project', 'project')
      .leftJoinAndSelect('project.owner', 'projectOwner') // Needed for filtering/permissions
      .skip(skip)
      .take(take)
      .orderBy('app.createdAt', 'DESC');

    // --- Refined Filtering Logic ---
    let filterApplied = false;

    if (filter) {
      if (filter === 'sent') {
        query.andWhere('app.applicantId = :userId', { userId: currentUser.id });
        filterApplied = true;
      } else if (filter === 'received') {
        // User receives applications for projects they OWN
        query.andWhere('project.ownerId = :userId', { userId: currentUser.id });
        filterApplied = true;
      }
    } else if (applicantId) {
      if (applicantId === 'me') {
        query.andWhere('app.applicantId = :userId', { userId: currentUser.id });
        filterApplied = true;
      } else {
        // Allow viewing specific user's applications only if it's the current user
        if (applicantId !== currentUser.id) {
          throw new ForbiddenException(
            'You can only filter applications by your own applicant ID.',
          );
        }
        query.andWhere('app.applicantId = :applicantId', { applicantId });
        filterApplied = true;
      }
    } else if (projectId) {
      // If filtering only by project, ensure user is owner of that project to see all apps.
      query.andWhere('app.projectId = :projectId', { projectId });
      query.andWhere('project.ownerId = :userId', { userId: currentUser.id }); // Restrict to owner
      filterApplied = true;
    }

    // If no primary filter is applied, throw error
    if (!filterApplied) {
      throw new BadRequestException(
        'Please specify a filter type ("sent", "received"), your applicant ID ("me"), or a project ID you own.',
      );
    }
    // --- End Refined Filtering Logic ---

    // Apply secondary filters
    if (status) {
      query.andWhere('app.status = :status', { status });
    }
    // If projectId was provided *in addition* to other filters (like 'sent'), apply it
    if (projectId && (filter || applicantId)) {
      // Ensure user has permission for this specific project filter combo if needed
      // e.g., if filter=sent and projectId=X, ensure user is the applicant AND project is X
      query.andWhere('app.projectId = :projectId', { projectId });
    }

    try {
      const [applications, total] = await query.getManyAndCount();
      // No further permission checks needed here as query itself restricts access
      return { applications, total };
    } catch (error) {
      console.error('Error finding applications:', error);
      throw new InternalServerErrorException(
        'Failed to retrieve applications.',
      );
    }
  }

  async findOne(
    applicationId: string,
    currentUserId: string,
  ): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['applicant', 'project', 'project.owner'], // Load relations needed for checks/response
    });
    if (!application) {
      throw new NotFoundException(
        `Application with ID "${applicationId}" not found.`,
      );
    }

    // --- Permission Check: Applicant or Project Owner can view ---
    if (
      application.applicantId !== currentUserId &&
      application.project.ownerId !== currentUserId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this application.',
      );
    }
    // -----------------------------------------------------------
    return application;
  }

  async updateStatus(
    applicationId: string,
    updateDto: UpdateApplicationStatusDto,
    currentUserId: string,
  ): Promise<Application> {
    // findOne checks view permission first
    const application = await this.findOne(applicationId, currentUserId);

    // --- Permission Check: Only Project Owner can accept/decline ---
    if (application.project.ownerId !== currentUserId) {
      throw new ForbiddenException(
        'Only the project owner can accept or decline applications.',
      );
    }
    // -----------------------------------------------------------

    // Check if application is already decided
    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException(
        `Application has already been ${application.status.toLowerCase()}.`,
      );
    }

    application.status = updateDto.status;

    // If accepted, add user to project members
    if (application.status === ApplicationStatus.ACCEPTED) {
      // Check if already a member (shouldn't happen if create check works, but belt-and-suspenders)
      const existingMembership = await this.membershipRepository.findOne({
        where: {
          projectId: application.projectId,
          userId: application.applicantId,
        },
      });
      if (!existingMembership) {
        const newMembership = this.membershipRepository.create({
          projectId: application.projectId,
          userId: application.applicantId,
          role: ProjectRole.MEMBER, // Default role for accepted applicants
        });
        try {
          await this.membershipRepository.save(newMembership);
        } catch (memError: unknown) {
          // Type the error as unknown and then check if it has code property
          const errorWithCode = memError as { code?: string };

          if (errorWithCode?.code === '23505') {
            console.warn(
              `Membership for user ${application.applicantId} on project ${application.projectId} already exists (concurrent add).`,
            );
          } else {
            console.error(
              `Error adding member ${application.applicantId} to project ${application.projectId} after accepting application:`,
              memError,
            );
            // Decide how to handle this - maybe revert status? For now, just log.
            throw new InternalServerErrorException(
              'Failed to add user to project after accepting application.',
            );
          }
        }
      } else {
        console.warn(
          `User ${application.applicantId} was already a member of project ${application.projectId} when application ${applicationId} was accepted.`,
        );
      }
    }

    try {
      return await this.applicationRepository.save(application);
    } catch (error) {
      console.error(
        `Error updating status for application ${applicationId}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to update application status.',
      );
    }
  }

  // Optional: Delete application (maybe only if pending and by applicant?)
  // async delete(applicationId: string, currentUserId: string): Promise<void> { ... }
}
