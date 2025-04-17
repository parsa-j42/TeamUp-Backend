import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from './profile.entity';
import {
  UpdateProfileDto,
  CompleteSignupProfileDto,
  UserProfileDto,
} from './dto/profile.dto';
import { UserService } from '@users/user.service';
import { SkillService } from '@skills/skill.service';
import { InterestService } from '@interests/interest.service';
import { Skill } from '@skills/skill.entity';
import { Interest } from '@interests/interest.entity';
import { WorkExperience } from '@work-experiences/work-experience.entity';
import { SkillDto } from '@skills/dto/skill.dto';
import { InterestDto } from '@interests/dto/interest.dto';
import { WorkExperienceDto } from '@work-experiences/dto/work-experience.dto';
import { User } from '@users/user.entity';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    // Use forwardRef if UserService also depends on ProfileService
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly skillService: SkillService,
    private readonly interestService: InterestService,
    // WorkExperienceService is not directly needed here as experiences are managed via their own controller
  ) {}

  /**
   * Finds a profile by User ID.
   * Optionally loads relations.
   */
  async findByUserId(
    userId: string,
    relations: string[] = [],
  ): Promise<UserProfile> {
    // Ensure 'skills', 'interests', and 'workExperiences' are included if needed by caller
    // These are the relations needed for the full UserProfileDto mapping
    const requiredRelations = new Set([
      ...relations,
      'skills',
      'interests',
      'workExperiences',
    ]);

    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: Array.from(requiredRelations),
    });
    if (!profile) {
      // This case should ideally not happen if profile is created with user.
      // Could indicate a data inconsistency.
      console.error(
        `Profile not found for user ID "${userId}", but user may exist.`,
      );
      throw new NotFoundException(`Profile not found for user ID "${userId}"`);
    }
    return profile;
  }

  /**
   * Updates a user's profile based on User ID.
   * Handles updates to User entity and Skill/Interest relationships.
   */
  async updateProfileByUserId(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserProfile> {
    // Destructure name and relation fields
    const {
      firstName,
      lastName,
      skills: skillNames,
      interests: interestNames,
      ...profileData
    } = dto;

    // 1. Update User entity fields if provided
    if (firstName || lastName) {
      const userUpdateData: Partial<Pick<User, 'firstName' | 'lastName'>> = {};
      if (firstName) userUpdateData.firstName = firstName;
      if (lastName) userUpdateData.lastName = lastName;
      // Consider if preferredUsername should also be updatable here
      await this.userService.updateUserCoreInfo(userId, userUpdateData);
    }

    // 2. Find the profile (load existing relations to avoid wiping others)
    // We load skills/interests here because assigning a new array below
    // requires TypeORM to know the current state to manage the join table correctly.
    const profile = await this.findByUserId(userId, ['skills', 'interests']); // Only load what's being managed here

    // 3. Apply direct profile field updates
    Object.assign(profile, profileData);

    // 4. Handle Skill relationship update
    if (skillNames !== undefined) {
      // Check if the key exists in the DTO (even if empty array)
      if (skillNames.length > 0) {
        profile.skills = await this.skillService.findOrCreateByName(skillNames);
      } else {
        profile.skills = []; // Clear skills if an empty array is provided
      }
    }

    // 5. Handle Interest relationship update
    if (interestNames !== undefined) {
      if (interestNames.length > 0) {
        profile.interests =
          await this.interestService.findOrCreateByName(interestNames);
      } else {
        profile.interests = []; // Clear interests if an empty array is provided
      }
    }

    // 6. Save the updated profile (TypeORM handles join table updates)
    try {
      return await this.profileRepository.save(profile);
    } catch (error) {
      console.error(`Error updating profile for user ${userId}:`, error);
      throw new InternalServerErrorException('Failed to update profile.');
    }
  }

  /**
   * Updates a user's profile with data from the final signup steps.
   */
  async completeSignupProfile(
    userId: string,
    dto: CompleteSignupProfileDto,
  ): Promise<UserProfile> {
    // Load profile including relations to be updated
    const profile = await this.findByUserId(userId, ['skills', 'interests']);

    profile.userType = dto.userType;
    profile.program = dto.program;
    profile.signupExperience = dto.signupExperience;

    // Handle Skills/Interests creation/linking
    profile.skills = await this.skillService.findOrCreateByName(dto.skills);
    profile.interests = await this.interestService.findOrCreateByName(
      dto.interests,
    );

    try {
      return await this.profileRepository.save(profile);
    } catch (error) {
      console.error(
        `Error completing signup profile for user ${userId}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to save profile signup data.',
      );
    }
  }

  /**
   * Maps a UserProfile entity to UserProfileDto.
   * Publicly accessible for other services (like UserService).
   */
  mapProfileToDto(profile: UserProfile): UserProfileDto {
    return {
      id: profile.id,
      userId: profile.userId,
      userType: profile.userType,
      program: profile.program,
      signupExperience: profile.signupExperience,
      status: profile.status,
      institution: profile.institution,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      bannerUrl: profile.bannerUrl,
      updatedAt: profile.updatedAt,
      // Fix: Use arrow functions to maintain the 'this' context
      skills: profile.skills?.map((skill) => this.mapSkillToDto(skill)) || [],
      interests:
        profile.interests?.map((interest) => this.mapInterestToDto(interest)) ||
        [],
      workExperiences:
        profile.workExperiences?.map((exp) =>
          this.mapWorkExperienceToDto(exp),
        ) || [],
    };
  }

  // --- Private Mapping Helpers ---
  private mapSkillToDto(skill: Skill): SkillDto {
    return { id: skill.id, name: skill.name, description: skill.description };
  }
  private mapInterestToDto(interest: Interest): InterestDto {
    return {
      id: interest.id,
      name: interest.name,
      description: interest.description,
    };
  }
  private mapWorkExperienceToDto(
    experience: WorkExperience,
  ): WorkExperienceDto {
    return {
      id: experience.id,
      profileId: experience.profileId,
      dateRange: experience.dateRange,
      workName: experience.workName,
      description: experience.description,
    };
  }
}
