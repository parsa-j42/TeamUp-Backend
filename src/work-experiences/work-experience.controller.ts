import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { WorkExperienceService } from './work-experience.service';
import {
  CreateWorkExperienceDto,
  UpdateWorkExperienceDto,
  WorkExperienceDto,
} from './dto/work-experience.dto';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@users/user.entity';
import { ProfileService } from '@profiles/profile.service'; // To get profile ID
import { WorkExperience } from './work-experience.entity';

// Define the controller path relative to the user's profile
@ApiTags('profiles') // Group under 'profiles' in Swagger
@ApiBearerAuth() // All endpoints require auth
@UseGuards(JwtAuthGuard)
@Controller('profiles/me/work-experiences') // Nested route
export class WorkExperienceController {
  constructor(
    private readonly experienceService: WorkExperienceService,
    private readonly profileService: ProfileService, // Inject to get profile ID
  ) {}

  // Helper to get profile ID for the current user
  private async getProfileId(user: User): Promise<string> {
    try {
      // Find profile just by user ID, no need for relations here
      const profile = await this.profileService.findByUserId(user.id);
      return profile.id;
    } catch (error) {
      if (error instanceof NotFoundException) {
        // This implies the user exists (JWT valid) but profile sync failed or profile deleted
        throw new NotFoundException('Profile not found for the current user.');
      }
      console.error(`Error fetching profile ID for user ${user.id}:`, error);
      throw new InternalServerErrorException(
        'Failed to retrieve profile context.',
      );
    }
  }

  @Get()
  @ApiOperation({ summary: "Get current user's work experiences" })
  @ApiResponse({
    status: 200,
    description: 'List of work experiences',
    type: [WorkExperienceDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async findAllForCurrentUser(
    @CurrentUser() user: User,
  ): Promise<WorkExperienceDto[]> {
    const profileId = await this.getProfileId(user);
    const experiences = await this.experienceService.findByProfileId(profileId);
    return experiences.map((experience) => this.mapExperienceToDto(experience));
  }

  @Post()
  @ApiOperation({ summary: "Add a work experience to current user's profile" })
  @ApiResponse({
    status: 201,
    description: 'Work experience created',
    type: WorkExperienceDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request (Validation Error)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async createForCurrentUser(
    @CurrentUser() user: User,
    @Body() createDto: CreateWorkExperienceDto,
  ): Promise<WorkExperienceDto> {
    const profileId = await this.getProfileId(user);
    const newExperience = await this.experienceService.createForProfile(
      profileId,
      createDto,
    );
    return this.mapExperienceToDto(newExperience);
  }

  @Patch(':experienceId')
  @ApiOperation({
    summary: 'Update a specific work experience for current user',
  })
  @ApiParam({
    name: 'experienceId',
    description: 'ID of the work experience to update',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Work experience updated',
    type: WorkExperienceDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request (Validation Error)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (Experience does not belong to user)',
  })
  @ApiResponse({
    status: 404,
    description: 'Profile or Work Experience not found',
  })
  async updateForCurrentUser(
    @CurrentUser() user: User,
    @Param('experienceId', ParseUUIDPipe) experienceId: string,
    @Body() updateDto: UpdateWorkExperienceDto,
  ): Promise<WorkExperienceDto> {
    const profileId = await this.getProfileId(user);
    // Service method handles not found / forbidden internally
    const updatedExperience = await this.experienceService.update(
      experienceId,
      profileId,
      updateDto,
    );
    return this.mapExperienceToDto(updatedExperience);
  }

  @Delete(':experienceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a specific work experience for current user',
  })
  @ApiParam({
    name: 'experienceId',
    description: 'ID of the work experience to delete',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Work experience deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (Experience does not belong to user)',
  })
  @ApiResponse({
    status: 404,
    description: 'Profile or Work Experience not found',
  })
  async removeForCurrentUser(
    @CurrentUser() user: User,
    @Param('experienceId', ParseUUIDPipe) experienceId: string,
  ): Promise<void> {
    const profileId = await this.getProfileId(user);
    // Service method handles not found / forbidden internally
    await this.experienceService.remove(experienceId, profileId);
  }

  // --- Helper to map Entity to DTO ---
  private mapExperienceToDto(experience: WorkExperience): WorkExperienceDto {
    return {
      id: experience.id,
      profileId: experience.profileId,
      dateRange: experience.dateRange,
      workName: experience.workName,
      description: experience.description,
    };
  }
}
