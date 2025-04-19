import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { ProjectMembership } from './project-membership.entity';
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
import { User } from '@users/user.entity';
import { ProjectRole } from '@common/enums/project-role.enum';
import { UserService } from '@users/user.service';
import { UserDto } from '@users/dto/user.dto'; // For mapping
import { Milestone } from '@milestones/milestone.entity'; // For mapping
import { Task } from '@tasks/task.entity'; // For mapping
import { MilestoneDto } from '@milestones/dto/milestone.dto'; // For mapping
import { TaskDto } from '@tasks/dto/task.dto'; // For mapping
// import { OmitType } from '@nestjs/swagger'; // For mapping

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMembership)
    private readonly membershipRepository: Repository<ProjectMembership>,
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    private readonly userService: UserService,
  ) {}

  // Default relations to load for a full ProjectDto response
  private defaultProjectRelations = [
    'owner',
    'memberships',
    'memberships.user',
    'milestones',
    'milestones.tasks', // Load tasks within milestones
    'milestones.tasks.assignee', // Load assignee for tasks
  ];

  /**
   * Creates a new project and assigns the creator as the OWNER.
   */
  async createProject(
    createDto: CreateProjectDto,
    owner: User,
  ): Promise<Project> {
    const { milestones: milestoneInputs, ...projectData } = createDto;

    const project = this.projectRepository.create({
      ...createDto,
      ownerId: owner.id,
      owner: owner, // Assign owner relation
      memberships: [], // Initialize memberships
      milestones: [], // Initialize milestones
    });

    // Create the initial membership for the owner
    const ownerMembership = this.membershipRepository.create({
      userId: owner.id,
      role: ProjectRole.OWNER,
    });

    // Add the membership to the project's memberships array
    // This relies on cascade:true on the Project entity's memberships relation
    project.memberships.push(ownerMembership);

    // Create Milestone entities if provided
    if (milestoneInputs && milestoneInputs.length > 0) {
      project.milestones = milestoneInputs.map(input => {
        const date = new Date(input.date);
        if (isNaN(date.getTime())) {
          throw new BadRequestException(`Invalid date format for milestone: ${input.title}`);
        }
        return this.milestoneRepository.create({ // Use milestone repo to create
          title: input.title,
          date: date,
          // project will be linked by cascade
        });
      });
    }

    try {
      // Save the project, which should cascade save the membership
      const savedProject = await this.projectRepository.save(project);
      // Re-fetch with default relations for consistent response object
      return this.findOne(savedProject.id, this.defaultProjectRelations);
    } catch (error) {
      console.error('Error creating project:', error);
      throw new InternalServerErrorException('Failed to create project.');
    }
  }

  /**
   * Finds projects based on query parameters.
   */
  async findAll(
    queryDto: FindProjectsQueryDto,
  ): Promise<{ projects: Project[]; total: number }> {
    const {
      skip = 0,
      take = 10,
      search,
      ownerId,
      memberId,
      skill,
      tag,
    } = queryDto;

    const query = this.projectRepository
      .createQueryBuilder('project')
      // Load relations needed for the list view / ProjectDto mapping
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.memberships', 'memberships')
      .leftJoinAndSelect('memberships.user', 'user')
      // Do not load milestones/tasks for list view by default to keep it lighter
      .skip(skip)
      .take(take)
      .orderBy('project.createdAt', 'DESC'); // Default order

    if (search) {
      query.andWhere(
        '(project.title ILIKE :search OR project.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (ownerId) {
      query.andWhere('project.ownerId = :ownerId', { ownerId });
    }

    if (memberId) {
      // Need to filter based on user ID within the memberships relation
      query.andWhere('memberships.userId = :memberId', { memberId });
    }

    // Updated skill filter to use case-insensitive ILIKE
    if (skill) {
      query.andWhere(
        '(project.requiredSkills ILIKE :startSkill OR project.requiredSkills ILIKE :containSkill OR project.requiredSkills ILIKE :endSkill OR project.requiredSkills ILIKE :exactSkill)',
        {
          startSkill: `${skill},%`,
          containSkill: `%,${skill},%`,
          endSkill: `%,${skill}`,
          exactSkill: skill,
        },
      );
    }

    // Updated tag filter to use case-insensitive ILIKE
    if (tag) {
      query.andWhere(
        '(project.tags ILIKE :startTag OR project.tags ILIKE :containTag OR project.tags ILIKE :endTag OR project.tags ILIKE :exactTag)',
        {
          startTag: `${tag},%`,
          containTag: `%,${tag},%`,
          endTag: `%,${tag}`,
          exactTag: tag,
        },
      );
    }

    try {
      const [projects, total] = await query.getManyAndCount();
      return { projects, total };
    } catch (error) {
      console.error('Error finding projects:', error);
      throw new InternalServerErrorException('Failed to retrieve projects.');
    }
  }

  /**
   * Finds a single project by ID, loading specified relations.
   * Sorts milestones and tasks chronologically.
   */
  async findOne(
    id: string,
    relations: string[] = this.defaultProjectRelations,
  ): Promise<Project> {
    // Use provided relations or default set for full DTO
    const project = await this.projectRepository.findOne({
      where: { id },
      relations,
    });
    if (!project) {
      throw new NotFoundException(`Project with ID "${id}" not found`);
    }
    // Sort milestones by date before returning
    if (project.milestones) {
      project.milestones.sort((a, b) => a.date.getTime() - b.date.getTime());
      // Sort tasks within milestones if needed (e.g., by createdAt)
      project.milestones.forEach((m) => {
        if (m.tasks) {
          m.tasks.sort(
            (ta, tb) => ta.createdAt.getTime() - tb.createdAt.getTime(),
          );
        }
      });
    }
    return project;
  }

  /**
   * Updates a project's details.
   * Ensures the user performing the update has permission (e.g., is owner).
   */
  async updateProject(
    id: string,
    updateDto: UpdateProjectDto,
    userId: string,
  ): Promise<Project> {
    const project = await this.findOne(id, ['owner']); // Load owner relation for check

    // --- Permission Check ---
    if (project.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this project.',
      );
    }
    // ----------------------

    // Apply updates (TypeORM handles partial updates)
    // Explicitly handle array updates to replace entirely.
    if (updateDto.requiredSkills !== undefined)
      project.requiredSkills = updateDto.requiredSkills ?? [];
    if (updateDto.tags !== undefined) project.tags = updateDto.tags ?? [];

    // Update other fields without the arrays that were already handled
    const otherUpdates = { ...updateDto };
    // Delete properties we've already handled to avoid applying them twice
    delete otherUpdates.requiredSkills;
    delete otherUpdates.tags;
    Object.assign(project, otherUpdates);

    try {
      const updatedProject = await this.projectRepository.save(project);
      // Re-fetch with default relations for consistent response object
      return this.findOne(updatedProject.id, this.defaultProjectRelations);
    } catch (error) {
      console.error(`Error updating project ${id}:`, error);
      throw new InternalServerErrorException('Failed to update project.');
    }
  }

  /**
   * Deletes a project.
   * Ensures the user performing the deletion has permission (e.g., is owner).
   */
  async deleteProject(id: string, userId: string): Promise<void> {
    const project = await this.findOne(id, ['owner']); // Load owner relation for check

    // --- Permission Check ---
    if (project.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this project.',
      );
    }
    // ----------------------

    // Deletion will cascade to memberships, milestones, tasks, applications, bookmarks
    // due to onDelete: 'CASCADE' settings in those entities.
    const result = await this.projectRepository.delete(id);
    if (result.affected === 0) {
      // Should not happen if findOne succeeded, but good practice
      throw new NotFoundException(
        `Project with ID "${id}" not found for deletion.`,
      );
    }
  }

  // --- Membership Management ---

  /**
   * Adds a member to a project.
   * Requires permission check (e.g., only owner can add members).
   */
  async addMember(
    projectId: string,
    addDto: AddMemberDto,
    currentUserId: string,
  ): Promise<ProjectMembership> {
    const project = await this.findOne(projectId, ['owner', 'memberships']);

    // --- Permission Check (Example: Only Owner can add) ---
    if (project.ownerId !== currentUserId) {
      throw new ForbiddenException('Only the project owner can add members.');
    }
    // ----------------------------------------------------

    // Check if user exists
    const userToAdd = await this.userService.findOne(addDto.userId); // Throws NotFoundException if user doesn't exist

    // Check if user is already a member
    const existingMembership = await this.membershipRepository.findOne({
      where: { projectId, userId: addDto.userId },
    });
    if (existingMembership) {
      throw new BadRequestException(
        `User ${userToAdd.firstName} is already a member of this project.`,
      );
    }

    // Prevent adding owner role if owner already exists
    if (
      addDto.role === ProjectRole.OWNER &&
      project.memberships.some((m) => m.role === ProjectRole.OWNER)
    ) {
      // Allow multiple owners? Or restrict? Let's restrict for now.
      throw new BadRequestException(
        'Project already has an owner. Assign a different role.',
      );
      // If allowing multiple owners, remove this check.
    }

    const newMembership = this.membershipRepository.create({
      projectId,
      userId: addDto.userId,
      role: addDto.role,
    });

    try {
      const savedMembership =
        await this.membershipRepository.save(newMembership);
      // Fetch the user details for the response DTO
      savedMembership.user = userToAdd; // Attach user entity for mapping
      return savedMembership;
    } catch (error) {
      // Catch potential unique constraint violation if race condition occurs
      const typedError = error as { code?: string };
      if (typedError?.code === '23505') {
        throw new BadRequestException(
          `User ${userToAdd.firstName} is already a member of this project (concurrent add).`,
        );
      }
      console.error(
        `Error adding member ${addDto.userId} to project ${projectId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to add member.');
    }
  }

  /**
   * Updates the role of an existing member.
   * Requires permission check.
   */
  async updateMemberRole(
    projectId: string,
    memberUserId: string,
    updateDto: UpdateMemberRoleDto,
    currentUserId: string,
  ): Promise<ProjectMembership> {
    const project = await this.findOne(projectId, ['owner', 'memberships']);

    // --- Permission Check (Example: Only Owner can update roles) ---
    if (project.ownerId !== currentUserId) {
      throw new ForbiddenException(
        'Only the project owner can update member roles.',
      );
    }
    // ----------------------------------------------------------

    // Find the membership to update
    const membership = await this.membershipRepository.findOne({
      where: { projectId, userId: memberUserId },
      relations: ['user'], // Load user for response DTO
    });
    if (!membership) {
      throw new NotFoundException(
        `Membership not found for user ${memberUserId} in project ${projectId}.`,
      );
    }

    // --- Role Change Logic ---
    // Prevent changing the original owner's role if they are the only owner
    if (
      membership.userId === project.ownerId &&
      membership.role === ProjectRole.OWNER &&
      updateDto.role !== ProjectRole.OWNER
    ) {
      const otherOwners = project.memberships.filter(
        (m) => m.role === ProjectRole.OWNER && m.userId !== membership.userId,
      );
      if (otherOwners.length === 0) {
        throw new BadRequestException(
          'Cannot change the role of the only owner.',
        );
      }
    }
    // Prevent assigning OWNER role if it's restricted to one (adjust if multiple owners allowed)
    if (
      updateDto.role === ProjectRole.OWNER &&
      membership.role !== ProjectRole.OWNER
    ) {
      // If restricting to one owner:
      throw new BadRequestException(
        'Cannot assign OWNER role to another member.',
      );
      // If allowing multiple owners, this check is not needed.
    }
    // -------------------------

    membership.role = updateDto.role;

    try {
      return await this.membershipRepository.save(membership);
    } catch (error) {
      console.error(
        `Error updating role for member ${memberUserId} in project ${projectId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to update member role.');
    }
  }

  /**
   * Removes a member from a project.
   * Requires permission check.
   */
  async removeMember(
    projectId: string,
    memberUserId: string,
    currentUserId: string,
  ): Promise<void> {
    const project = await this.findOne(projectId, ['owner', 'memberships']);

    // --- Permission Check (Example: Owner can remove anyone except themselves if they are the only owner; Members can remove themselves) ---
    const isOwnerRequesting = project.ownerId === currentUserId;
    const isRemovingSelf = memberUserId === currentUserId;

    if (!isOwnerRequesting && !isRemovingSelf) {
      throw new ForbiddenException(
        'You do not have permission to remove this member.',
      );
    }

    // Find the membership to remove
    const membership = await this.membershipRepository.findOne({
      where: { projectId, userId: memberUserId },
    });
    if (!membership) {
      throw new NotFoundException(
        `Membership not found for user ${memberUserId} in project ${projectId}.`,
      );
    }

    // Prevent owner from removing themselves if they are the only owner
    if (isRemovingSelf && membership.role === ProjectRole.OWNER) {
      const otherOwners = project.memberships.filter(
        (m) => m.role === ProjectRole.OWNER && m.userId !== memberUserId,
      );
      if (otherOwners.length === 0) {
        throw new BadRequestException(
          'Cannot remove the only owner from the project. Delete the project instead or assign a new owner.',
        );
      }
    }
    // Prevent owner removing the last member (themselves) - project should likely be deleted instead
    if (
      isOwnerRequesting &&
      isRemovingSelf &&
      project.memberships.length === 1
    ) {
      throw new BadRequestException(
        'Cannot remove the only member (owner). Delete the project instead.',
      );
    }
    // ------------------------------------------------------------------------------------------------------------------------------------

    const result = await this.membershipRepository.delete({
      id: membership.id,
    });
    if (result.affected === 0) {
      // Should not happen if findOne succeeded
      throw new NotFoundException(
        `Membership for user ${memberUserId} in project ${projectId} could not be removed.`,
      );
    }
  }

  // --- DTO Mapping Helpers ---
  mapProjectToDto(project: Project): ProjectDto {
    const ownerDto: Omit<UserDto, 'cognitoSub' | 'profile'> | null =
      project.owner
        ? {
            id: project.owner.id,
            email: project.owner.email,
            firstName: project.owner.firstName,
            lastName: project.owner.lastName,
            preferredUsername: project.owner.preferredUsername,
            createdAt: project.owner.createdAt,
            updatedAt: project.owner.updatedAt,
          }
        : null;

    const membersDto: ProjectMemberDto[] =
      project.memberships?.map((m) => this.mapMembershipToDto(m)) || [];
    const milestonesDto: MilestoneDto[] =
      project.milestones?.map((m) => this.mapMilestoneToDto(m)) || [];

    return {
      id: project.id,
      title: project.title,
      description: project.description,
      numOfMembers: project.numOfMembers,
      projectType: project.projectType,
      mentorRequest: project.mentorRequest,
      preferredMentor: project.preferredMentor,
      requiredSkills: project.requiredSkills,
      tags: project.tags,
      requiredRoles: project.requiredRoles,
      imageUrl: project.imageUrl,
      startDate: project.startDate?.toISOString(),
      endDate: project.endDate?.toISOString(),
      owner: ownerDto!, // Assert non-null as owner is mandatory
      members: membersDto,
      milestones: milestonesDto,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  mapMembershipToDto(membership: ProjectMembership): ProjectMemberDto {
    const userDto: Omit<UserDto, 'cognitoSub' | 'profile'> | null =
      membership.user
        ? {
            id: membership.user.id,
            email: membership.user.email,
            firstName: membership.user.firstName,
            lastName: membership.user.lastName,
            preferredUsername: membership.user.preferredUsername,
            createdAt: membership.user.createdAt,
            updatedAt: membership.user.updatedAt,
          }
        : null;

    return {
      id: membership.id,
      projectId: membership.projectId,
      userId: membership.userId,
      role: membership.role,
      user: userDto!, // Assert non-null as user relation should be loaded
      joinedAt: membership.joinedAt,
    };
  }

  mapMilestoneToDto(milestone: Milestone): MilestoneDto {
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

  mapTaskToDto(task: Task): TaskDto {
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

