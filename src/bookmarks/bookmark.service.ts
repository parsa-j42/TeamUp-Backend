import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Bookmark } from './bookmark.entity';
import { User } from '@users/user.entity';
import { ProjectService } from '@projects/project.service'; // To check project exists

@Injectable()
export class BookmarkService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarkRepository: Repository<Bookmark>,
    private readonly projectService: ProjectService, // Inject to ensure project exists
  ) {}

  async addBookmark(projectId: string, user: User): Promise<Bookmark> {
    // Check if project exists (loads minimal relations)
    await this.projectService.findOne(projectId, ['owner']); // Load owner for mapping later

    // Check if bookmark already exists (handled by unique index, but good practice)
    const existingBookmark = await this.bookmarkRepository.findOne({
      where: { projectId, userId: user.id },
    });
    if (existingBookmark) {
      // Silently return existing bookmark with loaded project details
      return this.findOne(existingBookmark.id, user.id);
    }

    const bookmark = this.bookmarkRepository.create({
      projectId,
      userId: user.id,
    });

    try {
      const savedBookmark = await this.bookmarkRepository.save(bookmark);
      // Reload relations for response DTO mapping
      return this.findOne(savedBookmark.id, user.id);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        error.message.includes('user_project_bookmarks_userId_projectId_idx')
      ) {
        // Handle race condition - return the existing bookmark found concurrently
        const concurrentBookmark = await this.bookmarkRepository.findOne({
          where: { projectId, userId: user.id },
          relations: ['project', 'project.owner'], // Load relations needed for DTO
        });
        if (concurrentBookmark) return concurrentBookmark;
        // If somehow still not found after conflict, throw original error maybe?
        throw new ConflictException(
          'Project already bookmarked (concurrent request).',
        );
      }
      console.error(
        `Error adding bookmark for user ${user.id} to project ${projectId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to add bookmark.');
    }
  }

  async removeBookmark(projectId: string, user: User): Promise<void> {
    const result = await this.bookmarkRepository.delete({
      projectId,
      userId: user.id,
    });
    if (result.affected === 0) {
      // This means the bookmark didn't exist in the first place
      throw new NotFoundException('Bookmark not found for this project.');
    }
  }

  async findUserBookmarks(user: User): Promise<Bookmark[]> {
    return this.bookmarkRepository.find({
      where: { userId: user.id },
      relations: ['project', 'project.owner'], // Load project details needed for the DTO
      order: { createdAt: 'DESC' },
    });
  }

  // Helper to find one bookmark by ID, ensuring ownership and loading relations
  async findOne(bookmarkId: string, userId: string): Promise<Bookmark> {
    const bookmark = await this.bookmarkRepository.findOne({
      where: { id: bookmarkId, userId: userId }, // Ensure it belongs to the user
      relations: ['project', 'project.owner'], // Load relations needed for DTO
    });
    if (!bookmark) {
      throw new NotFoundException(
        `Bookmark with ID "${bookmarkId}" not found.`,
      );
    }
    return bookmark;
  }
}
