import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  ManyToMany,
} from 'typeorm';
import { UserProfile } from '@profiles/profile.entity'; // Adjust path

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index() // Index for faster lookups by name
  name: string; // e.g., 'React', 'Photoshop'

  @Column('text', { nullable: true })
  description?: string; // Optional description from ProfilePage edit modal

  // Establish the relationship: Many Skills can belong to Many Profiles
  // 'skills' refers to the property name in UserProfile entity
  @ManyToMany(() => UserProfile, (profile) => profile.skills)
  // No @JoinTable needed here as UserProfile defines the owning side with @JoinTable
  profiles: UserProfile[];
}
