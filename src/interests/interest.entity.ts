import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  ManyToMany,
} from 'typeorm';
import { UserProfile } from '@profiles/profile.entity'; // Adjust path

@Entity('interests')
export class Interest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index() // Index for faster lookups by name
  name: string; // e.g., 'Economics', 'Design'

  @Column('text', { nullable: true })
  description?: string; // Optional description from ProfilePage edit modal

  // Establish the relationship: Many Interests can belong to Many Profiles
  // 'interests' refers to the property name in UserProfile entity
  @ManyToMany(() => UserProfile, (profile) => profile.interests)
  // No @JoinTable needed here as UserProfile defines the owning side with @JoinTable
  profiles: UserProfile[];
}
