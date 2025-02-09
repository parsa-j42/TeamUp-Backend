import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstructorService } from '@services/instructor.service';
import { InstructorController } from '@controllers/instructor.controller';
import { Instructor } from '@entities/instructor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Instructor])],
  controllers: [InstructorController],
  providers: [InstructorService],
})
export class InstructorModule {}
