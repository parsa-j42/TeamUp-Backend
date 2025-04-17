import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookmarkService } from './bookmark.service';
import { BookmarkController } from './bookmark.controller';
import { Bookmark } from './bookmark.entity';
import { AuthModule } from '@auth/auth.module';
import { ProjectModule } from '@projects/project.module'; // Import ProjectModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Bookmark]),
    AuthModule, // Provides JwtAuthGuard globally
    ProjectModule, // Provide ProjectService
  ],
  controllers: [BookmarkController],
  providers: [BookmarkService],
  exports: [BookmarkService], // Export if needed by other modules
})
export class BookmarkModule {}
