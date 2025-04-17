import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { User } from '@users/user.entity';
import { Project } from './project.entity';
import { ProjectRole } from '@common/enums/project-role.enum';

@Entity('project_memberships')
@Index(['userId', 'projectId'], { unique: true }) // Prevent duplicate memberships
export class ProjectMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.projectMemberships, {
    nullable: false,
    onDelete: 'CASCADE', // If user deleted, remove their memberships
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => Project, (project) => project.memberships, {
    nullable: false,
    onDelete: 'CASCADE', // If project deleted, remove its memberships
  })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('uuid')
  projectId: string;

  @Column({
    type: 'enum',
    enum: ProjectRole,
    nullable: false,
  })
  role: ProjectRole;

  // Add join date, etc. if needed
  @CreateDateColumn()
  joinedAt: Date;
}
