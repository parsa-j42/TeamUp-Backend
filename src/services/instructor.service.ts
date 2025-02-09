import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instructor } from '@entities/instructor.entity';

@Injectable()
export class InstructorService {
  constructor(
    @InjectRepository(Instructor)
    private instructorRepository: Repository<Instructor>,
  ) {}

  async createInstructor(instructor: Instructor): Promise<Instructor> {
    try {
      return await this.instructorRepository.save(instructor);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new HttpException(
        `Failed to create instructor: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getInstructorById(id: string): Promise<Instructor> {
    const instructor = await this.instructorRepository.findOne({
      where: { id },
    });

    if (!instructor) {
      throw new HttpException(
        'Failed to get instructor: Instructor not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return instructor;
  }

  async updateMentorshipAvailability(
    instructorId: string,
    isAvailable: boolean,
  ): Promise<Instructor> {
    const instructor = await this.instructorRepository.findOne({
      where: { id: instructorId },
    });

    if (!instructor) {
      throw new HttpException(
        'Failed to update instructor: Instructor not found',
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      instructor.availableForMentorship = isAvailable;
      return await this.instructorRepository.save(instructor);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new HttpException(
        `Failed to update instructor availability: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
