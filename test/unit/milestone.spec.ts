import { describe, it, expect } from 'vitest';
import { Milestone } from '../../src/entities/milestone.entity';

describe('Milestone Entity', () => {
  it('should create a milestone with default pending status', () => {
    const milestone: Milestone = new Milestone('m1', 'Prototype', new Date());
    expect(milestone.getId()).toEqual('m1');
    expect(milestone.getTitle()).toEqual('Prototype');
    expect(milestone.getStatus()).toEqual('pending');
  });

  it('should update the milestone status correctly', () => {
    const milestone: Milestone = new Milestone(
      'm2',
      'Design Phase',
      new Date(),
    );
    milestone.updateStatus('completed');
    expect(milestone.getStatus()).toEqual('completed');
  });
});
