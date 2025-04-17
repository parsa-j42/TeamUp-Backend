import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '@users/user.entity';
import { Project } from '@projects/project.entity';
import { ApplicationStatus } from '@common/enums/application-status.enum';

@Entity('applications')
@Index(['applicantId', 'projectId'], { unique: true }) // User can only apply once per project
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relation: Many Applications can be submitted by one User (Applicant)
  @ManyToOne(() => User, (user) => user.sentApplications, {
    nullable: false,
    onDelete: 'CASCADE', // If applicant deleted, remove their applications
  })
  @JoinColumn({ name: 'applicantId' })
  applicant: User;

  @Column('uuid')
  applicantId: string;

  // Relation: Many Applications can be for one Project
  @ManyToOne(() => Project, (project) => project.receivedApplications, {
    nullable: false,
    onDelete: 'CASCADE', // If project deleted, remove its applications
  })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('uuid')
  projectId: string;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  // Optional: Store the role the user applied for, based on Dashboard mock
  @Column({ nullable: true })
  roleAppliedFor?: string; // e.g., "Student's Skill/Applied Role"

  // Optional: Add a cover letter or message field if needed
  // @Column('text', { nullable: true })
  // message?: string;

  @CreateDateColumn()
  createdAt: Date; // Represents the 'time' field from Dashboard mock

  @UpdateDateColumn()
  updatedAt: Date; // Track when status changes
}
