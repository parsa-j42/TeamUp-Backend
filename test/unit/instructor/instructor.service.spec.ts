import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { InstructorService } from '@services/instructor.service';
import { Repository } from 'typeorm';
import { Instructor } from '@entities/instructor.entity';

describe('InstructorService', () => {
  let service: InstructorService;
  let mockRepository: Partial<Repository<Instructor>>;

  const mockInstructor = {
    id: '123',
    availableForMentorship: false,
  } as Instructor;

  beforeEach(() => {
    mockRepository = {
      findOne: vi.fn(),
      save: vi.fn(),
    } as Partial<Repository<Instructor>>;

    service = new InstructorService(mockRepository as Repository<Instructor>);
  });

  describe('createInstructor', () => {
    it('should create and return a new instructor', async () => {
      (mockRepository.save as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInstructor,
      );

      const result = await service.createInstructor(mockInstructor);

      expect(result).toEqual(mockInstructor);
      expect(mockRepository.save).toHaveBeenCalledWith(mockInstructor);
    });

    it('should throw HttpException when save fails', async () => {
      const error = new Error('Database error');
      (mockRepository.save as ReturnType<typeof vi.fn>).mockRejectedValue(
        error,
      );

      await expect(service.createInstructor(mockInstructor)).rejects.toThrow(
        new HttpException(
          'Failed to create instructor: Database error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('getInstructorById', () => {
    it('should return an instructor when found', async () => {
      (mockRepository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInstructor,
      );

      const result = await service.getInstructorById('123');

      expect(result).toEqual(mockInstructor);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123' },
      });
    });

    it('should throw HttpException when instructor not found', async () => {
      (mockRepository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      await expect(service.getInstructorById('123')).rejects.toThrow(
        new HttpException(
          'Failed to get instructor: Instructor not found',
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('updateMentorshipAvailability', () => {
    it('should update availability when instructor exists', async () => {
      (mockRepository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInstructor,
      );
      (mockRepository.save as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockInstructor,
        availableForMentorship: true,
      });

      const result = await service.updateMentorshipAvailability('123', true);

      expect(result.availableForMentorship).toBe(true);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123' },
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockInstructor,
        availableForMentorship: true,
      });
    });

    it('should throw HttpException when instructor not found', async () => {
      (mockRepository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      await expect(
        service.updateMentorshipAvailability('123', true),
      ).rejects.toThrow(
        new HttpException(
          'Failed to update instructor: Instructor not found',
          HttpStatus.NOT_FOUND,
        ),
      );
    });

    it('should throw HttpException when save fails', async () => {
      (mockRepository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInstructor,
      );

      const error = new Error('Database error');
      (mockRepository.save as ReturnType<typeof vi.fn>).mockRejectedValue(
        error,
      );

      await expect(
        service.updateMentorshipAvailability('123', true),
      ).rejects.toThrow(
        new HttpException(
          'Failed to update instructor availability: Database error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });
});
