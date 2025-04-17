import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '@users/user.entity';
import { ProjectMembership } from './project-membership.entity';
import { Milestone } from '@milestones/milestone.entity';
import { Application } from '@applications/application.entity';
import { Bookmark } from '@bookmarks/bookmark.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relationship: Many Projects can be owned by one User
  @ManyToOne(() => User, (user) => user.ownedProjects, {
    nullable: false, // A project must have an owner
    onDelete: 'CASCADE', // If owner is deleted, delete their projects? Or SET NULL/Restrict? Cascade seems reasonable here.
  })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column('uuid') // Store FK explicitly
  ownerId: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  // Fields from CreateProjectPage
  @Column({ nullable: true }) // e.g., '2-4', '10+'
  numOfMembers?: string;

  @Column({ nullable: true }) // e.g., 'remote', 'hybrid'
  projectType?: string;

  @Column({ nullable: true }) // e.g., 'looking', 'open'
  mentorRequest?: string;

  @Column({ nullable: true }) // e.g., 'one-time', 'regular'
  preferredMentor?: string;

  @Column('simple-array', { default: [] }) // Store as array of strings
  requiredSkills: string[];

  @Column('simple-array', { default: [] }) // Store as array of strings
  tags: string[]; // Combines tags from CreateProjectPage and ProjectPage

  // Fields from ProjectPage / ProfilePage Project List
  @Column('text', { nullable: true })
  requiredRoles?: string; // Description of roles needed

  @Column({ nullable: true })
  imageUrl?: string; // For the project card image

  // Fields from Dashboard
  @Column({ type: 'timestamp with time zone', nullable: true })
  startDate?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  endDate?: Date;

  // Relationship: One Project has Many Memberships
  @OneToMany(() => ProjectMembership, (membership) => membership.project, {
    cascade: true, // If project is saved/deleted, memberships are affected
    eager: false, // Load memberships only when requested
  })
  memberships: ProjectMembership[];

  // Relationship: One Project has Many Milestones
  @OneToMany(() => Milestone, (milestone) => milestone.project, {
    cascade: true, // If project deleted, delete its milestones
    eager: false,
  })
  milestones: Milestone[];

  // Relationship: One Project can receive Many Applications
  @OneToMany(() => Application, (application) => application.project)
  receivedApplications: Application[];

  // Relationship: One Project can have Many Bookmarks
  @OneToMany(() => Bookmark, (bookmark) => bookmark.project)
  bookmarkedBy: Bookmark[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
