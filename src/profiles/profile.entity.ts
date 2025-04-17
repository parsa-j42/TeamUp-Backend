import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { User } from '@users/user.entity';
import { Skill } from '@skills/skill.entity';
import { Interest } from '@interests/interest.entity';
import { WorkExperience } from '@work-experiences/work-experience.entity';

@Entity('user_profiles') // Specify table name
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Establish the relationship: One Profile belongs to One User
  @OneToOne(() => User, (user) => user.profile, {
    // No cascade needed here usually, managed from User side
    // onDelete: 'CASCADE' is handled by the FK constraint implicitly or by User side config
  })
  @JoinColumn({ name: 'userId' }) // Explicitly define the FK column name
  user: User;

  @Column('uuid') // Store the FK explicitly if needed, though `user.id` is accessible
  userId: string;

  // Fields from SignUpPage Step 1 & 2
  @Column({ nullable: true })
  userType?: string; // e.g., 'Student', 'Alumni', 'Instructor' (adjust as needed)

  @Column({ nullable: true })
  program?: string;

  @Column('text', { nullable: true })
  signupExperience?: string; // The 'experience' field from signup

  // Fields from ProfilePage
  @Column({ nullable: true })
  status?: string; // e.g., 'Undergraduate'

  @Column({ nullable: true })
  institution?: string; // e.g., 'SAIT - Software Development'

  @Column('text', { nullable: true })
  bio?: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ nullable: true })
  bannerUrl?: string;

  // --- Define owning side of ManyToMany for Skills ---
  @ManyToMany(() => Skill, (skill) => skill.profiles, {
    cascade: ['insert'], // Allow creating new skills when updating profile if needed
    eager: false, // Load skills only when requested
  })
  @JoinTable({
    // Define the join table
    name: 'user_profile_skills', // Explicit join table name
    joinColumn: { name: 'profileId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'skillId', referencedColumnName: 'id' },
  })
  skills: Skill[];
  // ---------------------------------------------------

  // --- Define owning side of ManyToMany for Interests ---
  @ManyToMany(() => Interest, (interest) => interest.profiles, {
    cascade: ['insert'], // Allow creating new interests when updating profile
    eager: false, // Load interests only when requested
  })
  @JoinTable({
    // Define the join table
    name: 'user_profile_interests', // Explicit join table name
    joinColumn: { name: 'profileId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'interestId', referencedColumnName: 'id' },
  })
  interests: Interest[];
  // ----------------------------------------------------

  // --- Define OneToMany relationship for Work Experiences ---
  // 'profile' refers to the property name in WorkExperience entity
  @OneToMany(() => WorkExperience, (experience) => experience.profile, {
    cascade: true, // Allow creating/updating/deleting experiences when profile is saved
    eager: false, // Load experiences only when requested
  })
  workExperiences: WorkExperience[];
  // -------------------------------------------------------

  @UpdateDateColumn()
  updatedAt: Date;

  // Note: No CreateDateColumn needed if profile is always created with User or shortly after
}
