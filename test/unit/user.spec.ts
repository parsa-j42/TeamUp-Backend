import { describe, it, expect, beforeEach } from 'vitest';
import { User } from '../../src/entities/user.entity';
import { Skill } from '../../src/entities/skill.entity';
import { Project } from '../../src/entities/project.entity';

describe('User Entity', () => {
  let user: User;

  beforeEach(() => {
    user = new User('u1', 'Alice', 'alice@example.com', 2025);
  });

  it('should create a user with empty skills, projects, and bookmarked projects', () => {
    expect(user).toBeDefined();
    const skills: Skill[] = user.getSkills();
    expect(skills.length).toEqual(0);

    const projects: Project[] = user.getProjects();
    expect(projects.length).toEqual(0);

    const bookmarks: Project[] = user.getBookmarkedProjects();
    expect(bookmarks.length).toEqual(0);
  });

  it('should add a skill to the user', () => {
    const skill: Skill = new Skill('s1', 'TypeScript', 'Programming');
    user.addSkill(skill);
    const skills: Skill[] = user.getSkills();
    expect(skills.length).toEqual(1);
    expect(skills[0]).toEqual(skill);
  });

  it('should add a project to the user', () => {
    const project: Project = new Project(
      'p1',
      'Awesome Project',
      'Project Description',
      new Date(),
      new Date(Date.now() + 86400000),
      user, // using the current user as the owner
    );
    user.addProject(project);
    const projects: Project[] = user.getProjects();
    expect(projects.length).toEqual(1);
    expect(projects[0]).toEqual(project);
  });

  it('should allow the user to bookmark a project', () => {
    const project: Project = new Project(
      'p2',
      'Another Project',
      'Another Description',
      new Date(),
      new Date(Date.now() + 86400000),
      user,
    );
    user.bookmarkProject(project);
    const bookmarks: Project[] = user.getBookmarkedProjects();
    expect(bookmarks.length).toEqual(1);
    expect(bookmarks[0]).toEqual(project);
  });
});
