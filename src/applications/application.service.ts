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
import { InviteUserDto } from './dto/invite-user.dto';
import { User } from '@users/user.entity';
import { ProjectService } from '@projects/project.service';
import { ProjectMembership } from '@projects/project-membership.entity';
import { ProjectRole } from '@common/enums/project-role.enum';
import { ApplicationStatus } from '@common/enums/application-status.enum';
import { UserService } from '@users/user.service';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly projectService: ProjectService,
    @InjectRepository(ProjectMembership)
    private readonly membershipRepository: Repository<ProjectMembership>,
    private readonly userService: UserService,
  ) {}

  async create(
    projectId: string,
    applicant: User,
    createDto: CreateApplicationDto,
  ): Promise<Application> {
    const project = await this.projectService.findOne(projectId, [
      'owner',
      'memberships',
    ]);

    if (
      project.ownerId === applicant.id ||
      project.memberships.some((m) => m.userId === applicant.id)
    ) {
      throw new BadRequestException(
        'You are already a member or the owner of this project.',
      );
    }

    const existingApplication = await this.applicationRepository.findOne({
      where: { projectId, applicantId: applicant.id },
    });
    if (existingApplication) {
      throw new ConflictException(
        'You have already applied to or been invited to this project.',
      );
    }

    const application = this.applicationRepository.create({
      ...createDto,
      projectId: projectId,
      applicantId: applicant.id,
      status: ApplicationStatus.PENDING,
    });

    try {
      const savedApp = await this.applicationRepository.save(application);
      // Pass applicantId for permission check in findOne
      return this.findOne(savedApp.id, applicant.id);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        error.message.includes('applications_applicantId_projectId_idx')
      ) {
        throw new ConflictException(
          'You have already applied to or been invited to this project (concurrent request).',
        );
      }
      console.error(
        `Error creating application for user ${applicant.id} to project ${projectId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to submit application.');
    }
  }

  async inviteUser(
    projectId: string,
    inviteDto: InviteUserDto,
    ownerId: string,
  ): Promise<Application> {
    const project = await this.projectService.findOne(projectId, [
      'owner',
      'memberships',
    ]);
    if (project.ownerId !== ownerId) {
      throw new ForbiddenException('Only the project owner can invite users.');
    }

    const userToInvite = await this.userService.findOne(inviteDto.userId);

    if (
      project.ownerId === userToInvite.id ||
      project.memberships.some((m) => m.userId === userToInvite.id)
    ) {
      throw new BadRequestException(
        `User ${userToInvite.preferredUsername} is already a member or the owner.`,
      );
    }

    const existingApplication = await this.applicationRepository.findOne({
      where: { projectId, applicantId: userToInvite.id },
    });
    if (existingApplication) {
      throw new ConflictException(
        `An application or invitation for ${userToInvite.preferredUsername} already exists for this project.`,
      );
    }

    const invitation = this.applicationRepository.create({
      projectId: projectId,
      applicantId: userToInvite.id,
      status: ApplicationStatus.INVITED,
      roleAppliedFor: inviteDto.role || ProjectRole.MEMBER,
    });

    try {
      const savedInvitation = await this.applicationRepository.save(invitation);
      const reloadedInvite = await this.applicationRepository.findOneOrFail({
        where: { id: savedInvitation.id },
        relations: ['applicant', 'project', 'project.owner'],
      });
      return reloadedInvite;
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        error.message.includes('applications_applicantId_projectId_idx')
      ) {
        throw new ConflictException(
          `An application or invitation for ${userToInvite.preferredUsername} already exists for this project (concurrent request).`,
        );
      }
      console.error(
        `Error inviting user ${inviteDto.userId} to project ${projectId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to send invitation.');
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
      .leftJoinAndSelect('project.owner', 'projectOwner')
      .skip(skip)
      .take(take)
      .orderBy('app.createdAt', 'DESC');

    let filterApplied = false;

    if (filter) {
      if (filter === 'sent') {
        // User's sent applications (PENDING status only)
        query.andWhere('app.applicantId = :userId', { userId: currentUser.id });
        query.andWhere('app.status = :statusPending', {
          statusPending: ApplicationStatus.PENDING,
        });
        filterApplied = true;
      } else if (filter === 'received') {
        // Applications/Invitations received by the user OR applications for projects they own
        query.andWhere(
          '( (app.applicantId = :userId AND app.status = :invitedStatus) OR (project.ownerId = :userId AND app.status = :pendingStatus) )', // <-- Corrected logic
          {
            userId: currentUser.id,
            invitedStatus: ApplicationStatus.INVITED, // User receives INVITED applications addressed to them
            pendingStatus: ApplicationStatus.PENDING, // Owner receives PENDING applications to their project
          },
        );
        filterApplied = true;
      }
    } else if (applicantId) {
      // Allow viewing specific user's applications only if it's the current user
      if (applicantId !== 'me' && applicantId !== currentUser.id) {
        throw new ForbiddenException(
          'You can only filter applications by your own applicant ID.',
        );
      }
      // Filter by current user's applications (sent PENDING or received INVITED)
      query.andWhere('app.applicantId = :userId', { userId: currentUser.id });
      // Optionally filter further by status if provided
      if (status) {
        query.andWhere('app.status = :status', { status });
      } else {
        // If no specific status, show PENDING and INVITED for 'me' filter
        query.andWhere('app.status IN (:...statuses)', {
          statuses: [ApplicationStatus.PENDING, ApplicationStatus.INVITED],
        });
      }
      filterApplied = true;
    } else if (projectId) {
      // If filtering only by project, ensure user is owner of that project to see PENDING apps.
      query.andWhere('app.projectId = :projectId', { projectId });
      query.andWhere('project.ownerId = :userId', { userId: currentUser.id });
      query.andWhere('app.status = :statusPending', {
        statusPending: ApplicationStatus.PENDING,
      }); // Only show pending apps TO the owner
      filterApplied = true;
    }

    if (!filterApplied) {
      throw new BadRequestException(
        'Please specify a filter type ("sent", "received"), your applicant ID ("me"), or a project ID you own.',
      );
    }

    // Apply secondary status filter if provided AND primary filter wasn't status-specific already
    if (status && !(applicantId && !filter)) {
      query.andWhere('app.status = :status', { status });
    }
    // Apply secondary project filter if provided
    if (projectId && (filter || applicantId)) {
      query.andWhere('app.projectId = :projectId', { projectId });
    }

    try {
      const [applications, total] = await query.getManyAndCount();
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
      relations: ['applicant', 'project', 'project.owner'],
    });
    if (!application) {
      throw new NotFoundException(
        `Application with ID "${applicationId}" not found.`,
      );
    }

    // Permission Check: Applicant or Project Owner can view
    const isApplicant = application.applicantId === currentUserId;
    const isOwner = application.project.ownerId === currentUserId;

    // Applicant can view PENDING, INVITED, ACCEPTED, DECLINED
    // Owner can view PENDING
    const canView =
      (isApplicant &&
        [
          ApplicationStatus.PENDING,
          ApplicationStatus.INVITED,
          ApplicationStatus.ACCEPTED,
          ApplicationStatus.DECLINED,
        ].includes(application.status)) ||
      (isOwner && application.status === ApplicationStatus.PENDING);

    if (!canView) {
      throw new ForbiddenException(
        'You do not have permission to view this application.',
      );
    }
    return application;
  }

  async updateStatus(
    applicationId: string,
    updateDto: UpdateApplicationStatusDto,
    currentUserId: string,
  ): Promise<Application> {
    // findOne checks basic view permission first
    const application = await this.findOne(applicationId, currentUserId);

    // --- Permission Check: Who can update status? ---
    const isApplicant = application.applicantId === currentUserId;
    const isOwner = application.project.ownerId === currentUserId;

    if (application.status === ApplicationStatus.PENDING && !isOwner) {
      throw new ForbiddenException(
        'Only the project owner can accept or decline pending applications.',
      );
    }
    if (application.status === ApplicationStatus.INVITED && !isApplicant) {
      throw new ForbiddenException(
        'Only the invited user can accept or decline an invitation.',
      );
    }
    // -----------------------------------------------

    // Check if application is already decided
    if (
      ![ApplicationStatus.PENDING, ApplicationStatus.INVITED].includes(
        application.status,
      )
    ) {
      throw new BadRequestException(
        `Application has already been ${application.status.toLowerCase()}.`,
      );
    }

    application.status = updateDto.status;

    // If accepted, add user to project members
    if (application.status === ApplicationStatus.ACCEPTED) {
      const existingMembership = await this.membershipRepository.findOne({
        where: {
          projectId: application.projectId,
          userId: application.applicantId,
        },
      });
      if (!existingMembership) {
        const newMembership = this.membershipRepository.create({
          project: { id: application.projectId },
          user: { id: application.applicantId },
          role: application.roleAppliedFor as unknown as ProjectRole || ProjectRole.MEMBER,
        });
        try {
          await this.membershipRepository.save(newMembership);
        } catch (memError: unknown) {
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
}

