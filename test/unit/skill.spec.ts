import { describe, it, expect } from 'vitest';
import { Skill } from '../../src/entities/skill.entity';

describe('Skill Entity', () => {
  it('should create a skill with correct properties', () => {
    const skill: Skill = new Skill('s1', 'JavaScript', 'Programming');
    expect(skill.getId()).toEqual('s1');
    expect(skill.getName()).toEqual('JavaScript');
    expect(skill.getCategory()).toEqual('Programming');
  });
});
