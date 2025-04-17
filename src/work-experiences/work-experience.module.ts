import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkExperienceService } from './work-experience.service';
import { WorkExperienceController } from './work-experience.controller';
import { WorkExperience } from './work-experience.entity';
import { AuthModule } from '@auth/auth.module'; // For guards
import { ProfileModule } from '@profiles/profile.module'; // To get profile context

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkExperience]),
    forwardRef(() => AuthModule), // Needed for JwtAuthGuard (global anyway)
    forwardRef(() => ProfileModule), // Needed to inject ProfileService
  ],
  providers: [WorkExperienceService],
  controllers: [WorkExperienceController], // Expose controller for routing
  exports: [WorkExperienceService], // Export service if needed elsewhere
})
export class WorkExperienceModule {}
