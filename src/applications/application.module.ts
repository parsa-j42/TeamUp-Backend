import { Module, forwardRef } from '@nestjs/common'; // Add forwardRef import
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { Application } from './application.entity';
import { AuthModule } from '@auth/auth.module';
import { ProjectModule } from '@projects/project.module'; // Import ProjectModule
import { ProjectMembership } from '@projects/project-membership.entity'; // Import Membership entity

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, ProjectMembership]), // Include Membership repo
    AuthModule, // Provides JwtAuthGuard globally
    forwardRef(() => ProjectModule),
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService],
  exports: [ApplicationService], // Export if needed by other modules
})
export class ApplicationModule {}
