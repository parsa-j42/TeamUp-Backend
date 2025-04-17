import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BookmarkService } from './bookmark.service';
import { BookmarkDto } from './dto/bookmark.dto';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@users/user.entity';
import { Bookmark } from './bookmark.entity';
import { ProjectDto } from '@projects/dto/project.dto';

@ApiTags('bookmarks') // Or group under 'users' or 'projects'
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me/bookmarks') // User-centric route
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  @Get()
  @ApiOperation({ summary: "Get current user's bookmarked projects" })
  @ApiResponse({
    status: 200,
    description: 'List of bookmarks with project details',
    type: [BookmarkDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMyBookmarks(@CurrentUser() user: User): Promise<BookmarkDto[]> {
    const bookmarks = await this.bookmarkService.findUserBookmarks(user);
    return bookmarks.map((b) => this.mapBookmarkToDto(b));
  }

  // Add bookmark endpoint (could also be POST /projects/:projectId/bookmark)
  @Post('/project/:projectId')
  @ApiOperation({ summary: 'Bookmark a project for the current user' })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project to bookmark',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'Bookmark created successfully',
    type: BookmarkDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 409, description: 'Conflict (Already bookmarked)' })
  async addBookmark(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: User,
  ): Promise<BookmarkDto> {
    // Service handles conflict by returning existing bookmark
    const bookmark = await this.bookmarkService.addBookmark(projectId, user);
    return this.mapBookmarkToDto(bookmark);
  }

  // Remove bookmark endpoint (could also be DELETE /projects/:projectId/bookmark)
  @Delete('/project/:projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a bookmark for a project for the current user',
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project to unbookmark',
    type: 'string',
  })
  @ApiResponse({ status: 204, description: 'Bookmark removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Bookmark or Project not found' })
  async removeBookmark(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    // Service handles not found
    await this.bookmarkService.removeBookmark(projectId, user);
  }

  // --- DTO Mapping Helper ---
  private mapBookmarkToDto(bookmark: Bookmark): BookmarkDto {
    // Map project using simplified fields, ensuring owner is included if needed by DTO
    const projectDto: Omit<ProjectDto, 'members' | 'milestones'> | null =
      bookmark.project
        ? {
            id: bookmark.project.id,
            title: bookmark.project.title,
            description: bookmark.project.description,
            numOfMembers: bookmark.project.numOfMembers,
            projectType: bookmark.project.projectType,
            mentorRequest: bookmark.project.mentorRequest,
            preferredMentor: bookmark.project.preferredMentor,
            requiredSkills: bookmark.project.requiredSkills,
            tags: bookmark.project.tags,
            requiredRoles: bookmark.project.requiredRoles,
            imageUrl: bookmark.project.imageUrl,
            startDate: bookmark.project.startDate?.toISOString(),
            endDate: bookmark.project.endDate?.toISOString(),
            createdAt: bookmark.project.createdAt,
            updatedAt: bookmark.project.updatedAt,
            // Ensure owner details are loaded and mapped
            owner: bookmark.project.owner
              ? {
                  id: bookmark.project.owner.id,
                  email: bookmark.project.owner.email,
                  firstName: bookmark.project.owner.firstName,
                  lastName: bookmark.project.owner.lastName,
                  preferredUsername: bookmark.project.owner.preferredUsername,
                  createdAt: bookmark.project.owner.createdAt,
                  updatedAt: bookmark.project.owner.updatedAt,
                }
              : null!, // Add non-null assertion if owner is mandatory for ProjectDto base
          }
        : null;

    return {
      id: bookmark.id,
      userId: bookmark.userId,
      projectId: bookmark.projectId,
      project: projectDto!, // Assert non-null as project relation should be loaded
      createdAt: bookmark.createdAt,
    };
  }
}
