import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  NotFoundException,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import {
  UserProfileDto,
  UpdateProfileDto,
  CompleteSignupProfileDto,
} from './dto/profile.dto';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@users/user.entity';

@ApiTags('profiles')
@Controller('profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: "Get current user's profile" })
  @ApiResponse({
    status: 200,
    description: "Current user's profile data",
    type: UserProfileDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getCurrentUserProfile(
    @CurrentUser() user: User,
  ): Promise<UserProfileDto> {
    try {
      // Load all necessary relations for the DTO
      const profile = await this.profileService.findByUserId(user.id, [
        'skills',
        'interests',
        'workExperiences',
      ]);
      return this.profileService.mapProfileToDto(profile); // Use service mapper
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching current user profile:', error);
      throw new InternalServerErrorException('Failed to retrieve profile.');
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('me')
  @ApiOperation({ summary: "Update current user's profile" })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UserProfileDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request (Validation Error)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async updateCurrentUserProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    try {
      await this.profileService.updateProfileByUserId(
        user.id,
        updateProfileDto,
      );
      // Re-fetch with relations to ensure DTO is complete after update
      const fullProfile = await this.profileService.findByUserId(user.id, [
        'skills',
        'interests',
        'workExperiences',
      ]);
      return this.profileService.mapProfileToDto(fullProfile); // Use service mapper
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error updating current user profile:', error);
      throw new InternalServerErrorException('Failed to update profile.');
    }
  }

  // Endpoint potentially called after Cognito confirmation and user sync,
  // to add the profile details from signup steps 1 & 2.
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('me/complete-signup') // Changed to POST as it creates/sets data
  @ApiOperation({
    summary: 'Add profile details after initial signup (Steps 1 & 2)',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile details added',
    type: UserProfileDto,
  }) // Changed to 200 OK
  @ApiResponse({ status: 400, description: 'Bad Request (Validation Error)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async completeSignup(
    @CurrentUser() user: User,
    @Body() completeSignupDto: CompleteSignupProfileDto,
  ): Promise<UserProfileDto> {
    try {
      await this.profileService.completeSignupProfile(
        user.id,
        completeSignupDto,
      );
      // Re-fetch with relations
      const fullProfile = await this.profileService.findByUserId(user.id, [
        'skills',
        'interests',
        'workExperiences',
      ]);
      return this.profileService.mapProfileToDto(fullProfile); // Use service mapper
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error completing signup profile:', error);
      throw new InternalServerErrorException(
        'Failed to save profile signup data.',
      );
    }
  }

  // Mapping helpers are now primarily in ProfileService
}
