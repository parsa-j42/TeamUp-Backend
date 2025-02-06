import { Skill } from './skill.entity';
import { Project } from './project.entity';

export class User {
  private readonly id: string;
  private name: string;
  private email: string;
  private graduationYear: number;
  private skills: Skill[];
  private projects: Project[];
  private bookmarkedProjects: Project[];

  constructor(id: string, name: string, email: string, graduationYear: number) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.graduationYear = graduationYear;
    this.skills = [];
    this.projects = [];
    this.bookmarkedProjects = [];
  }

  addSkill(skill: Skill): void {
    this.skills.push(skill);
  }

  addProject(project: Project): void {
    this.projects.push(project);
  }

  bookmarkProject(project: Project): void {
    this.bookmarkedProjects.push(project);
  }

  getSkills(): Skill[] {
    return [...this.skills];
  }

  getProjects(): Project[] {
    return [...this.projects];
  }

  getBookmarkedProjects(): Project[] {
    return [...this.bookmarkedProjects];
  }
}
