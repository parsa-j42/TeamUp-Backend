import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UserDto, CreateOrUpdateUserDto, SimpleUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from './user.entity';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Keep existing GET /users (for search/invite)
  @UseGuards(JwtAuthGuard) // Should this be protected? Yes, probably.
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Get all users (simplified, requires auth)' }) // Updated summary
  @ApiResponse({
    status: 200,
    description: 'List of users',
    type: [SimpleUserDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAllUsers(): Promise<SimpleUserDto[]> {
    // Consider adding search query param handling here if needed for the invite feature
    try {
      return await this.userService.findAllSimplified();
    } catch (error) {
      console.error('Error in getAllUsers endpoint:', error);
      throw new InternalServerErrorException('Failed to retrieve users list');
    }
  }

  // Keep existing POST /users/sync
  @Post('sync')
  @ApiOperation({
    summary:
      'Synchronize users data from Cognito (Internal - Requires Protection)',
  })
  @ApiResponse({
    status: 200,
    description: 'User created or updated',
    type: UserDto,
  })
  @ApiResponse({ status: 409, description: 'Conflict (e.g., email exists)' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async syncUser(@Body() dto: CreateOrUpdateUserDto): Promise<UserDto> {
    try {
      const user = await this.userService.createOrUpdateFromCognito(dto);
      return {
        id: user.id,
        cognitoSub: user.cognitoSub,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        preferredUsername: user.preferredUsername,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      console.error('Error in syncUser endpoint:', error);
      throw new InternalServerErrorException('Failed to synchronize users.');
    }
  }

  // Keep existing GET /users/me
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({
    summary: "Get current users's details including full profile",
  })
  @ApiResponse({
    status: 200,
    description: 'Current users data with profile',
    type: UserDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User or Profile not found' })
  async getCurrentUser(@CurrentUser() user: User): Promise<UserDto> {
    try {
      return await this.userService.findOneMapped(user.id, true);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(
        `Error fetching mapped user data for user ${user.id}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to retrieve users data.');
    }
  }

  // --- NEW Public Endpoint to get user by ID ---
  @Get(':id')
  @ApiOperation({ summary: "Get a specific user's public profile by ID" })
  @ApiParam({ name: 'id', description: 'User ID (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'User data with profile',
    type: UserDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getUserById(@Param('id', ParseUUIDPipe) id: string): Promise<UserDto> {
    try {
      // Fetch user data including the profile, similar to 'me' endpoint
      // The service method handles mapping and includes the profile
      return await this.userService.findOneMapped(id, true);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error; // Re-throw NotFoundException
      }
      console.error(`Error fetching mapped user data for user ${id}:`, error);
      throw new InternalServerErrorException('Failed to retrieve user data.');
    }
  }
  // --- END NEW Endpoint ---
}
