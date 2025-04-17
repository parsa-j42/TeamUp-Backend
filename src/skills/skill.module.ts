import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SkillService } from './skill.service';
// import { SkillController } from './skill.controller'; // Optional: Add if admin endpoints needed
import { Skill } from './skill.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Skill])],
  // controllers: [SkillController], // Uncomment if controller is added
  providers: [SkillService],
  exports: [SkillService], // Export service for ProfileModule
})
export class SkillModule {}
