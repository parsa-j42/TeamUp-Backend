import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserProfile } from '@profiles/profile.entity'; // Adjust path

@Entity('portfolio_projects')
export class PortfolioProject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relation: Many PortfolioProjects belong to one UserProfile
  @ManyToOne(() => UserProfile, (profile) => profile.portfolioProjects, {
    nullable: false,
    onDelete: 'CASCADE', // If profile deleted, delete associated portfolio projects
  })
  @JoinColumn({ name: 'profileId' })
  profile: UserProfile;

  @Column('uuid')
  profileId: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column('simple-array', { default: [] }) // Store tags as array of strings
  tags: string[];

  @Column({ nullable: true })
  imageUrl?: string; // For the project image (URL managed externally for now)

  // Optional: Add project URL, date, etc. if needed
  // @Column({ nullable: true })
  // projectUrl?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
