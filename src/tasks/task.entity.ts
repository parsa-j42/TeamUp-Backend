import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Milestone } from '@milestones/milestone.entity';
import { User } from '@users/user.entity';
import { TaskStatus } from '@common/enums/task-status.enum';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Milestone, (milestone) => milestone.tasks, {
    nullable: false, // A task must belong to a milestone
    onDelete: 'CASCADE', // If milestone deleted, delete task
  })
  @JoinColumn({ name: 'milestoneId' })
  milestone: Milestone;

  @Column('uuid')
  milestoneId: string;

  // Nullable relationship: A Task can be assigned to one User
  @ManyToOne(() => User, (user) => user.assignedTasks, {
    nullable: true, // Task might be unassigned
    onDelete: 'SET NULL', // If assignee user deleted, set assigneeId to NULL
    eager: false, // Load assignee only when explicitly requested
  })
  @JoinColumn({ name: 'assigneeId' })
  assignee?: User | null; // Use nullable type

  @Column('uuid', { nullable: true }) // Store FK explicitly, make it nullable
  assigneeId?: string | null;

  @Column()
  name: string; // e.g., "Task Name"

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO, // Default status
  })
  status: TaskStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Add due date, priority, etc. if needed
  // @Column({ type: 'timestamp with time zone', nullable: true })
  // dueDate?: Date;
}
