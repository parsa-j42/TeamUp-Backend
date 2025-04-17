import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Column,
} from 'typeorm';
import { User } from '@users/user.entity';
import { Project } from '@projects/project.entity';

@Entity('user_project_bookmarks')
@Index(['userId', 'projectId'], { unique: true }) // Prevent duplicate bookmarks
export class Bookmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.bookmarks, {
    nullable: false,
    onDelete: 'CASCADE', // If user deleted, remove their bookmarks
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => Project, (project) => project.bookmarkedBy, {
    nullable: false,
    onDelete: 'CASCADE', // If project deleted, remove bookmarks for it
  })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('uuid')
  projectId: string;

  @CreateDateColumn()
  createdAt: Date; // When the bookmark was created
}
