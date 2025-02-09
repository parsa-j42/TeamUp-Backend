import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { Instructor } from '@entities/instructor.entity';

describe('Instructor Entity', () => {
  let instructor: Instructor;

  it('should create a new instructor instance', () => {
    instructor = new Instructor();

    expect(instructor.id).toBeUndefined();
    expect(instructor.availableForMentorship).toBeUndefined();
  });

  it('should create an instructor with provided values', () => {
    instructor = new Instructor();
    instructor.id = '123';
    instructor.availableForMentorship = true;

    expect(instructor.id).toBe('123');
    expect(instructor.availableForMentorship).toBe(true);
  });

  it('should allow updating mentorship availability', () => {
    instructor = new Instructor();
    instructor.id = '123';

    // Test changing from default (false) to true
    instructor.availableForMentorship = true;
    expect(instructor.availableForMentorship).toBe(true);

    // Test changing from true to false
    instructor.availableForMentorship = false;
    expect(instructor.availableForMentorship).toBe(false);
  });
});
