import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { InstructorService } from '@services/instructor.service';
import { Instructor } from '@entities/instructor.entity';

@Controller('instructors')
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  @Post()
  async createInstructor(@Body() instructor: Instructor): Promise<Instructor> {
    return this.instructorService.createInstructor(instructor);
  }

  @Get(':id')
  async getInstructorById(@Param('id') id: string): Promise<Instructor> {
    return this.instructorService.getInstructorById(id);
  }

  @Patch(':id/mentorship-availability')
  async updateMentorshipAvailability(
    @Param('id') id: string,
    @Body('isAvailable') isAvailable: boolean,
  ): Promise<Instructor> {
    return this.instructorService.updateMentorshipAvailability(id, isAvailable);
  }
}
