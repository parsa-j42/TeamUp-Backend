import { Module, forwardRef } from '@nestjs/common'; // Import forwardRef
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { Project } from './project.entity';
import { ProjectMembership } from './project-membership.entity';
import { AuthModule } from '@auth/auth.module';
import { UserModule } from '@users/user.module';
import { Milestone } from '@milestones/milestone.entity';
import { ApplicationModule } from '@applications/application.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectMembership, Milestone]),
    AuthModule, // Provides JwtAuthGuard globally
    UserModule, // Provides UserService
    forwardRef(() => ApplicationModule),
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}