import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
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

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({
    summary: 'Get all users with simplified information',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all users with id and name',
    type: [SimpleUserDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAllUsers(): Promise<SimpleUserDto[]> {
    try {
      return await this.userService.findAllSimplified();
    } catch (error) {
      console.error('Error in getAllUsers endpoint:', error);
      throw new InternalServerErrorException('Failed to retrieve users list');
    }
  }

  // --- Endpoint potentially called by Cognito Post Confirmation Trigger ---
  // This endpoint should ideally be protected (e.g., IAM auth, secret key)
  // For simplicity here, we leave it open but acknowledge it needs securing.
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
      // createOrUpdateFromCognito returns the User entity
      const user = await this.userService.createOrUpdateFromCognito(dto);
      // Map using the basic users info only for the sync response
      return {
        id: user.id,
        cognitoSub: user.cognitoSub,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        preferredUsername: user.preferredUsername,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // profile is explicitly not included here
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error; // Re-throw conflict exception
      }
      console.error('Error in syncUser endpoint:', error);
      throw new InternalServerErrorException('Failed to synchronize users.');
    }
  }

  // --- Endpoint to get the currently logged-in users's data ---
  @UseGuards(JwtAuthGuard) // Apply the guard
  @ApiBearerAuth() // Indicate JWT is needed in Swagger
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
    // Use the service method that handles mapping internally
    try {
      return await this.userService.findOneMapped(user.id, true); // Request profile inclusion
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error; // Re-throw NotFound
      }
      console.error(
        `Error fetching mapped user data for user ${user.id}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to retrieve users data.');
    }
  }

  // Other endpoints like GET /users/:id might be needed for admin purposes
  // or viewing other profiles, but based strictly on the provided frontend code,
  // only 'me' seems directly required for now.
}
