import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { Task } from './task.entity';
import { AuthModule } from '@auth/auth.module';
import { MilestoneModule } from '@milestones/milestone.module'; // Import MilestoneModule
import { UserModule } from '@users/user.module'; // Import UserModule
import { ProjectModule } from '@projects/project.module'; // Import ProjectModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    AuthModule, // Provides JwtAuthGuard globally
    forwardRef(() => MilestoneModule), // Handle potential circular dependency with MilestoneService
    UserModule, // Provide UserService
    ProjectModule, // Provide ProjectService
  ],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService], // Export if needed by other modules
})
export class TaskModule {}
