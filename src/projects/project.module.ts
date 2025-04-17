import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { Project } from './project.entity';
import { ProjectMembership } from './project-membership.entity';
import { AuthModule } from '@auth/auth.module'; // For guards
import { UserModule } from '@users/user.module'; // To inject UserService

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectMembership]),
    AuthModule, // Provides JwtAuthGuard globally
    UserModule, // Provides UserService
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService], // Export if needed by other modules (e.g., MilestoneService)
})
export class ProjectModule {}
