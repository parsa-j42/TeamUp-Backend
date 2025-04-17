import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { UserProfile } from './profile.entity';
import { UserModule } from '@users/user.module';
import { AuthModule } from '@auth/auth.module';
import { SkillModule } from '@skills/skill.module';
import { InterestModule } from '@interests/interest.module';
import { WorkExperienceModule } from '@work-experiences/work-experience.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserProfile]),
    forwardRef(() => UserModule), // Use forwardRef for circular dependency with UserService
    forwardRef(() => AuthModule), // Make AuthModule available (it's global anyway)
    SkillModule, // Import SkillModule
    InterestModule, // Import InterestModule
    WorkExperienceModule, // Import WorkExperienceModule
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService], // Export service if needed by other modules
})
export class ProfileModule {}
