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
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PortfolioProjectService } from './portfolio-project.service';
import {
  CreatePortfolioProjectDto,
  UpdatePortfolioProjectDto,
  PortfolioProjectDto,
} from './dto/portfolio-project.dto';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@users/user.entity';
import { ProfileService } from '@profiles/profile.service'; // To get profile ID
import { PortfolioProject } from './portfolio-project.entity';

@ApiTags('profiles') // Group under profiles
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profiles/me/portfolio-projects') // Nested route under user's profile
export class PortfolioProjectController {
  constructor(
    private readonly portfolioProjectService: PortfolioProjectService,
    private readonly profileService: ProfileService, // Inject to get profile ID
  ) {}

  // Helper to get profile ID for the current user
  private async getProfileId(user: User): Promise<string> {
    try {
      const profile = await this.profileService.findByUserId(user.id); // No relations needed
      return profile.id;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('Profile not found for the current user.');
      }
      console.error(
        `Error fetching profile ID for user ${user.id} in PortfolioProjectController:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve profile context.',
      );
    }
  }

  // Note: GET is usually handled by fetching the full profile in ProfileController/Service

  @Post()
  @ApiOperation({
    summary: "Add a portfolio project to current user's profile",
  })
  @ApiResponse({
    status: 201,
    description: 'Portfolio project created',
    type: PortfolioProjectDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request (Validation Error)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async createForCurrentUser(
    @CurrentUser() user: User,
    @Body() createDto: CreatePortfolioProjectDto,
  ): Promise<PortfolioProjectDto> {
    const profileId = await this.getProfileId(user);
    const newProject = await this.portfolioProjectService.createForProfile(
      profileId,
      createDto,
    );
    return this.mapToDto(newProject);
  }

  @Patch(':projectId')
  @ApiOperation({
    summary: 'Update a specific portfolio project for current user',
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the portfolio project to update',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Portfolio project updated',
    type: PortfolioProjectDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request (Validation Error)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (Project does not belong to user)',
  })
  @ApiResponse({
    status: 404,
    description: 'Profile or Portfolio Project not found',
  })
  async updateForCurrentUser(
    @CurrentUser() user: User,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() updateDto: UpdatePortfolioProjectDto,
  ): Promise<PortfolioProjectDto> {
    const profileId = await this.getProfileId(user);
    // Service method handles not found / forbidden internally
    const updatedProject = await this.portfolioProjectService.update(
      projectId,
      profileId,
      updateDto,
    );
    return this.mapToDto(updatedProject);
  }

  @Delete(':projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a specific portfolio project for current user',
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the portfolio project to delete',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Portfolio project deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (Project does not belong to user)',
  })
  @ApiResponse({
    status: 404,
    description: 'Profile or Portfolio Project not found',
  })
  async removeForCurrentUser(
    @CurrentUser() user: User,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<void> {
    const profileId = await this.getProfileId(user);
    // Service method handles not found / forbidden internally
    await this.portfolioProjectService.remove(projectId, profileId);
  }

  // --- Helper to map Entity to DTO ---
  private mapToDto(project: PortfolioProject): PortfolioProjectDto {
    return {
      id: project.id,
      profileId: project.profileId,
      title: project.title,
      description: project.description,
      tags: project.tags,
      imageUrl: project.imageUrl,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
