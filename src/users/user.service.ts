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
   * Finds all users and returns them in the SimpleUserDto format.
   */
  async findAllSimplified(): Promise<SimpleUserDto[]> {
    try {
      const users = await this.userRepository.find();
      // Map to the updated SimpleUserDto structure
      return users.map((user) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        preferredUsername: user.preferredUsername,
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
      userDto.profile = this.profileService.mapProfileToDto(user.profile);
    } else if (includeProfile && !user.profile) {
      console.warn(`Profile requested but not found for user ${userId}`);
      userDto.profile = undefined;
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
   * Initializes an empty profile if creating a new users.
   */
  async createOrUpdateFromCognito(dto: CreateOrUpdateUserDto): Promise<User> {
    try {
      let user = await this.findByCognitoSub(dto.cognitoSub);

      if (user) {
        user.email = dto.email;
        user.firstName = dto.firstName;
        user.lastName = dto.lastName;
        user.preferredUsername = dto.preferredUsername;
      } else {
        user = this.userRepository.create({
          ...dto,
          profile: new UserProfile(),
        });
      }

      return await this.userRepository.save(user);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        if ((error as unknown as PostgresError).code === '23505') {
          if (error.message.includes('users_email_key')) {
            throw new ConflictException(`Email "${dto.email}" already exists.`);
          }
          if (error.message.includes('users_cognitoSub_key')) {
            throw new ConflictException( `Cognito Sub "${dto.cognitoSub}" already exists.` );
          }
          throw new ConflictException( 'A unique constraint violation occurred.' );
        }
      }
      console.error('Error in createOrUpdateFromCognito:', error);
      throw new InternalServerErrorException( 'Failed to create or update users.' );
    }
  }

  /**
   * Updates basic users details (like name).
   */
  async updateUserCoreInfo(
      userId: string,
      data: Partial<Pick<User, 'firstName' | 'lastName' | 'preferredUsername'>>,
  ): Promise<User> {
    const user = await this.findOne(userId);
    if (data.firstName) user.firstName = data.firstName;
    if (data.lastName) user.lastName = data.lastName;
    if (data.preferredUsername) user.preferredUsername = data.preferredUsername;

    try {
      return await this.userRepository.save(user);
    } catch (error) {
      console.error(`Error updating core info for user ${userId}:`, error);
      throw new InternalServerErrorException( 'Failed to update users core information.' );
    }
  }
}