import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MilestoneService } from './milestone.service';
import { MilestoneController } from './milestone.controller';
import { Milestone } from './milestone.entity';
import { AuthModule } from '@auth/auth.module';
import { ProjectModule } from '@projects/project.module'; // Import ProjectModule
import { TaskModule } from '@tasks/task.module'; // Import TaskModule for relations

@Module({
  imports: [
    TypeOrmModule.forFeature([Milestone]),
    AuthModule, // Provides JwtAuthGuard globally
    ProjectModule, // Provide ProjectService for permissions
    forwardRef(() => TaskModule), // Handle circular dependency if needed
  ],
  controllers: [MilestoneController],
  providers: [MilestoneService],
  exports: [MilestoneService], // Export for TaskService
})
export class MilestoneModule {}
