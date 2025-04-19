import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { User } from './user.entity';
import { CreateOrUpdateUserDto, UserDto, SimpleUserDto } from './dto/user.dto';
import { UserProfile } from '@profiles/profile.entity';
import { ProfileService } from '@profiles/profile.service';

interface PostgresError extends Error {
  code: string;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    // Use forwardRef if ProfileService also depends on UserService, creating a circular dependency
    @Inject(forwardRef(() => ProfileService))
    private readonly profileService: ProfileService,
  ) {}

  /**
   * Finds a users by their internal UUID.
   * Optionally loads relations.
   */
  async findOne(id: string, relations: string[] = []): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations,
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  /**
   * Finds all users and returns them in a simplified format
   * with just ID and name (preferred name + last name)
   */
  async findAllSimplified(): Promise<SimpleUserDto[]> {
    try {
      const users = await this.userRepository.find();
      return users.map((user) => ({
        id: user.id,
        name: `${user.preferredUsername} ${user.lastName}`,
      }));
    } catch (error) {
      console.error('Error finding all users:', error);
      throw new InternalServerErrorException('Failed to retrieve users list');
    }
  }

  /**
   * Finds a users by ID and maps it to UserDto, optionally including a mapped profile.
   */
  async findOneMapped(
    userId: string,
    includeProfile: boolean = false,
  ): Promise<UserDto> {
    const relationsToLoad = includeProfile
      ? [
          'profile',
          'profile.skills',
          'profile.interests',
          'profile.workExperiences',
          'profile.portfolioProjects',
        ]
      : [];
    const user = await this.findOne(userId, relationsToLoad);

    const userDto: UserDto = {
      id: user.id,
      cognitoSub: user.cognitoSub,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      preferredUsername: user.preferredUsername,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    if (includeProfile && user.profile) {
      // Use ProfileService's mapping logic
      userDto.profile = this.profileService.mapProfileToDto(user.profile);
    } else if (includeProfile && !user.profile) {
      // Handle case where profile might be missing unexpectedly
      console.warn(`Profile requested but not found for user ${userId}`);
      userDto.profile = undefined; // Or an empty object, depending on desired contract
    }

    return userDto;
  }

  /**
   * Finds a users by their Cognito Subject identifier.
   * Optionally loads relations.
   */
  async findByCognitoSub(
    cognitoSub: string,
    relations: string[] = [],
  ): Promise<User | null> {
    return this.userRepository.findOne({ where: { cognitoSub }, relations });
  }

  /**
   * Finds a users by their email address.
   * Optionally loads relations.
   */
  async findByEmail(
    email: string,
    relations: string[] = [],
  ): Promise<User | null> {
    return this.userRepository.findOne({ where: { email }, relations });
  }

  /**
   * Creates a new users or updates an existing one based on Cognito Sub.
   * Typically called after Cognito authentication/confirmation.
   * Initializes an empty profile if creating a new users.
   */
  async createOrUpdateFromCognito(dto: CreateOrUpdateUserDto): Promise<User> {
    try {
      let user = await this.findByCognitoSub(dto.cognitoSub);

      if (user) {
        // Update existing users
        user.email = dto.email;
        user.firstName = dto.firstName;
        user.lastName = dto.lastName;
        user.preferredUsername = dto.preferredUsername;
      } else {
        // Create new users
        user = this.userRepository.create({
          ...dto,
          profile: new UserProfile(), // Create an empty profile linked to the users
        });
      }

      return await this.userRepository.save(user);
    } catch (error) {
      // TypeORM QueryFailedError
      if (error instanceof QueryFailedError) {
        // Check for unique constraint violation (code 23505 for PostgreSQL)
        if ((error as unknown as PostgresError).code === '23505') {
          if (error.message.includes('users_email_key')) {
            throw new ConflictException(`Email "${dto.email}" already exists.`);
          }
          if (error.message.includes('users_cognitoSub_key')) {
            // This case should ideally be handled by the findByCognitoSub check,
            // but adding it for robustness in case of race conditions.
            throw new ConflictException(
              `Cognito Sub "${dto.cognitoSub}" already exists.`,
            );
          }
          throw new ConflictException(
            'A unique constraint violation occurred.',
          );
        }
      }
      // Log the detailed error for debugging
      console.error('Error in createOrUpdateFromCognito:', error);
      throw new InternalServerErrorException(
        'Failed to create or update users.',
      );
    }
  }

  /**
   * Updates basic users details (like name).
   * Should be used carefully, ensuring cognitoSub/email aren't changed arbitrarily.
   */
  async updateUserCoreInfo(
    userId: string,
    data: Partial<Pick<User, 'firstName' | 'lastName' | 'preferredUsername'>>,
  ): Promise<User> {
    const user = await this.findOne(userId); // Ensures users exists
    // Only update allowed fields
    if (data.firstName) user.firstName = data.firstName;
    if (data.lastName) user.lastName = data.lastName;
    if (data.preferredUsername) user.preferredUsername = data.preferredUsername;

    try {
      return await this.userRepository.save(user);
    } catch (error) {
      console.error(`Error updating core info for user ${userId}:`, error);
      throw new InternalServerErrorException(
        'Failed to update users core information.',
      );
    }
  }

  // We might need a delete method later, but it needs careful consideration
  // regarding Cognito users deletion synchronization.
  // async deleteUser(id: string): Promise<void> { ... }
}
