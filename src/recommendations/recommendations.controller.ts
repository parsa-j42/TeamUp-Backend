import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@users/user.entity';
import { RecommendedProjectDto } from './dto/recommendations.dto';

@ApiTags('recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  private readonly logger = new Logger(RecommendationsController.name);

  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('projects')
  @ApiOperation({ summary: 'Get personalized project recommendations for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of recommended projects with reasons',
    type: [RecommendedProjectDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error (e.g., Gemini API issue)' })
  async getProjectRecommendations(
    @CurrentUser() user: User,
  ): Promise<RecommendedProjectDto[]> {
    this.logger.log(`Fetching recommendations for user ID: ${user.id}`);
    try {
      const recommendations = await this.recommendationsService.getProjectRecommendations(user);
      this.logger.log(`Returning ${recommendations.length} recommendations for user ID: ${user.id}`);
      return recommendations;
    } catch (error) {
      this.logger.error(`Error fetching recommendations for user ${user.id}: ${error.message}`, error.stack);
      // Let the service handle throwing appropriate exceptions
      throw error;
    }
  }
}