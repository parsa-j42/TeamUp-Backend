import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { InstructorController } from '@controllers/instructor.controller';
import { InstructorService } from '@services/instructor.service';
import { Instructor } from '@entities/instructor.entity';

describe('InstructorController', () => {
  let controller: InstructorController;
  let mockService: Partial<InstructorService>;

  const mockInstructor = {
    id: '123',
    availableForMentorship: false,
  } as Instructor;

  beforeEach(() => {
    mockService = {
      createInstructor: vi.fn(),
      getInstructorById: vi.fn(),
      updateMentorshipAvailability: vi.fn(),
    } as Partial<InstructorService>;

    controller = new InstructorController(mockService as InstructorService);
  });

  describe('createInstructor', () => {
    it('should create and return a new instructor', async () => {
      (
        mockService.createInstructor as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockInstructor);

      const result = await controller.createInstructor(mockInstructor);

      expect(result).toEqual(mockInstructor);
      expect(mockService.createInstructor).toHaveBeenCalledWith(mockInstructor);
    });

    it('should propagate service errors', async () => {
      const error = new HttpException(
        'Failed to create instructor: Database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

      (
        mockService.createInstructor as ReturnType<typeof vi.fn>
      ).mockRejectedValue(error);

      await expect(controller.createInstructor(mockInstructor)).rejects.toThrow(
        error,
      );
    });
  });

  describe('getInstructorById', () => {
    it('should return an instructor when found', async () => {
      (
        mockService.getInstructorById as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockInstructor);

      const result = await controller.getInstructorById('123');

      expect(result).toEqual(mockInstructor);
      expect(mockService.getInstructorById).toHaveBeenCalledWith('123');
    });

    it('should propagate not found error from service', async () => {
      const error = new HttpException(
        'Failed to get instructor: Instructor not found',
        HttpStatus.NOT_FOUND,
      );

      (
        mockService.getInstructorById as ReturnType<typeof vi.fn>
      ).mockRejectedValue(error);

      await expect(controller.getInstructorById('123')).rejects.toThrow(error);
    });
  });

  describe('updateMentorshipAvailability', () => {
    it('should update availability successfully', async () => {
      const updatedInstructor = {
        ...mockInstructor,
        availableForMentorship: true,
      };

      (
        mockService.updateMentorshipAvailability as ReturnType<typeof vi.fn>
      ).mockResolvedValue(updatedInstructor);

      const result = await controller.updateMentorshipAvailability('123', true);

      expect(result).toEqual(updatedInstructor);
      expect(mockService.updateMentorshipAvailability).toHaveBeenCalledWith(
        '123',
        true,
      );
    });

    it('should propagate not found error from service', async () => {
      const error = new HttpException(
        'Failed to update instructor: Instructor not found',
        HttpStatus.NOT_FOUND,
      );

      (
        mockService.updateMentorshipAvailability as ReturnType<typeof vi.fn>
      ).mockRejectedValue(error);

      await expect(
        controller.updateMentorshipAvailability('123', true),
      ).rejects.toThrow(error);
    });

    it('should propagate service errors', async () => {
      const error = new HttpException(
        'Failed to update instructor availability: Database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

      (
        mockService.updateMentorshipAvailability as ReturnType<typeof vi.fn>
      ).mockRejectedValue(error);

      await expect(
        controller.updateMentorshipAvailability('123', true),
      ).rejects.toThrow(error);
    });
  });
});
