import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { UserProfile } from '@profiles/profile.entity';
import { Project } from '@projects/project.entity';
import { ProjectMembership } from '@projects/project-membership.entity';
import { Task } from '@tasks/task.entity';
import { Application } from '@applications/application.entity';
import { Bookmark } from '@bookmarks/bookmark.entity';

@Entity('users') // Specify table name for clarity
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index() // Index for faster lookups
  cognitoSub: string; // Identifier from Cognito

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  preferredUsername: string; // From signup step 0

  // Establish the relationship: One User has One Profile
  // 'users' here refers to the 'users' property back in UserProfile
  // cascade: true means if a User is saved/updated, related profile operations might cascade
  // eager: false means the profile won't be loaded automatically unless specified in query
  @OneToOne(() => UserProfile, (profile) => profile.user, {
    cascade: true, // If users is created/updated, profile might be too
    onDelete: 'CASCADE', // If users is deleted, delete their profile
  })
  profile: UserProfile; // This property holds the related profile object

  // --- Relationship: One User can own Many Projects ---
  @OneToMany(() => Project, (project) => project.owner)
  ownedProjects: Project[];
  // --------------------------------------------------

  // --- Relationship: One User can have Many Project Memberships ---
  @OneToMany(() => ProjectMembership, (membership) => membership.user)
  projectMemberships: ProjectMembership[];
  // ------------------------------------------------------------

  // --- Relationship: One User can be assigned Many Tasks ---
  @OneToMany(() => Task, (task) => task.assignee)
  assignedTasks: Task[];
  // -------------------------------------------------------

  // --- Relationship: One User can send Many Applications ---
  @OneToMany(() => Application, (application) => application.applicant)
  sentApplications: Application[];
  // -------------------------------------------------------

  // --- Relationship: One User can have Many Bookmarks ---
  @OneToMany(() => Bookmark, (bookmark) => bookmark.user)
  bookmarks: Bookmark[];
  // ----------------------------------------------------

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
