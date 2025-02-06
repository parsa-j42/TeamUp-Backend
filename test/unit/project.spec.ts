import { describe, it, expect, beforeEach } from 'vitest';
import { Project } from '../../src/entities/project.entity';
import { User } from '../../src/entities/user.entity';
import { Skill } from '../../src/entities/skill.entity';
import { Milestone } from '../../src/entities/milestone.entity';

describe('Project Entity', () => {
  let owner: User;
  let project: Project;

  beforeEach(() => {
    owner = new User('u1', 'Alice', 'alice@example.com', 2025);
    project = new Project(
      'p1',
      'Test Project',
      'A test project',
      new Date(),
      new Date(Date.now() + 86400000),
      owner,
    );
  });

  it('should create a project with no members, milestones, or required skills', () => {
    expect(project).toBeDefined();
    const members = project.getMembers();
    expect(members.length).toEqual(0);

    const milestones = project.getMilestones();
    expect(milestones.length).toEqual(0);

    const reqSkills = project.getRequiredSkills();
    expect(reqSkills.length).toEqual(0);
  });

  it('should add a member to the project', () => {
    const member: User = new User('u2', 'Bob', 'bob@example.com', 2026);
    project.addMember(member);
    const members = project.getMembers();
    expect(members.length).toEqual(1);
    expect(members[0]).toEqual(member);
  });

  it('should add a required skill to the project', () => {
    const skill: Skill = new Skill('s1', 'Node.js', 'Backend');
    project.addRequiredSkill(skill);
    const reqSkills = project.getRequiredSkills();
    expect(reqSkills.length).toEqual(1);
    expect(reqSkills[0]).toEqual(skill);
  });

  it('should add a milestone to the project', () => {
    const milestone: Milestone = new Milestone(
      'm1',
      'Design Phase',
      new Date(Date.now() + 43200000),
    );
    project.addMilestone(milestone);
    const milestones = project.getMilestones();
    expect(milestones.length).toEqual(1);
    expect(milestones[0]).toEqual(milestone);
  });
});
