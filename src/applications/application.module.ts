import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { Application } from './application.entity';
import { AuthModule } from '@auth/auth.module';
import { ProjectModule } from '@projects/project.module';
import { ProjectMembership } from '@projects/project-membership.entity';
import { UserModule } from '@users/user.module'; // Add this import

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, ProjectMembership]),
    AuthModule,
    forwardRef(() => ProjectModule),
    UserModule,
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
