import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Project } from '@projects/project.entity';
import { Task } from '@tasks/task.entity';

@Entity('milestones')
export class Milestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, (project) => project.milestones, {
    nullable: false,
    onDelete: 'CASCADE', // If project deleted, delete its milestones
  })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('uuid')
  projectId: string;

  @Column()
  title: string; // e.g., "A very loooong title..."

  @Column({ type: 'timestamp with time zone' }) // Store the specific date/time
  date: Date; // e.g., "2025-01-02T00:00:00Z"

  @Column({ default: false })
  active: boolean; // Indicates if this is the current/active milestone in the timeline UI

  // Relationship: One Milestone can have Many Tasks
  @OneToMany(() => Task, (task) => task.milestone, {
    cascade: true, // If milestone deleted, delete its tasks
    eager: false,
  })
  tasks: Task[];

  @CreateDateColumn() // Track when the milestone was added
  createdAt: Date;

  // Add order column if manual sorting is needed
  // @Column({ type: 'int', nullable: true })
  // order?: number;
}
