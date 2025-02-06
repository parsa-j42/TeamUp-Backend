import { Skill } from './skill.entity';
import { Milestone } from './milestone.entity';
import { User } from './user.entity';

export class Project {
  private readonly id: string;
  private title: string;
  private description: string;
  private timeline: { startDate: Date; endDate: Date };
  private status: string;
  private milestones: Milestone[];
  private owner: User;
  private members: User[];
  private requiredSkills: Skill[];

  constructor(
    id: string,
    title: string,
    description: string,
    startDate: Date,
    endDate: Date,
    owner: User,
  ) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.timeline = { startDate, endDate };
    this.status = 'active'; // default status
    this.milestones = [];
    this.owner = owner;
    this.members = [];
    this.requiredSkills = [];
  }

  addMember(user: User): void {
    this.members.push(user);
  }

  addRequiredSkill(skill: Skill): void {
    this.requiredSkills.push(skill);
  }

  addMilestone(milestone: Milestone): void {
    this.milestones.push(milestone);
  }

  getMembers(): User[] {
    return [...this.members];
  }

  getMilestones(): Milestone[] {
    return [...this.milestones];
  }

  getRequiredSkills(): Skill[] {
    return [...this.requiredSkills];
  }
}
