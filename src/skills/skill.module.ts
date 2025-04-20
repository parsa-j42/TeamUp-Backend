import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SkillService } from './skill.service';
import { Skill } from './skill.entity';
import { SkillsController } from '@skills/skill.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Skill])],
  controllers: [SkillsController],
  providers: [SkillService],
  exports: [SkillService],
})
export class SkillModule {}
