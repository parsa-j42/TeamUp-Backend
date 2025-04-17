import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserProfile } from '@profiles/profile.entity'; // Adjust path

@Entity('work_experiences')
export class WorkExperience {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Establish the relationship: Many WorkExperiences belong to One UserProfile
  @ManyToOne(() => UserProfile, (profile) => profile.workExperiences, {
    onDelete: 'CASCADE', // If profile is deleted, delete associated experiences
    nullable: false, // An experience must belong to a profile
  })
  @JoinColumn({ name: 'profileId' }) // Explicitly define the FK column name
  profile: UserProfile;

  @Column('uuid') // Store the FK explicitly
  profileId: string;

  @Column()
  dateRange: string; // e.g., "May 2021 - Dec 2022"

  @Column()
  workName: string; // e.g., "Work Name 1" or "Project Lead at X"

  @Column('text')
  description: string;

  // No CreateDateColumn/UpdateDateColumn needed unless tracking edits specifically
}
