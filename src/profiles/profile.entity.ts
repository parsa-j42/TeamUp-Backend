import {
  Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn, OneToOne,
  JoinColumn, ManyToMany, JoinTable, OneToMany,
} from 'typeorm';
import { User } from '@users/user.entity';
import { Skill } from '@skills/skill.entity';
import { Interest } from '@interests/interest.entity';
import { WorkExperience } from '@work-experiences/work-experience.entity';
import { PortfolioProject } from '@portfolio-projects/portfolio-project.entity';

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid') id: string;
  @OneToOne(() => User, (user) => user.profile) @JoinColumn({ name: 'userId' }) user: User;
  @Column('uuid') userId: string;
  @Column({ nullable: true }) userType?: string;
  @Column({ nullable: true }) program?: string;
  @Column('text', { nullable: true }) signupExperience?: string;
  @Column({ nullable: true }) status?: string;
  @Column({ nullable: true }) institution?: string;
  @Column('text', { nullable: true }) bio?: string;
  @Column({ nullable: true }) avatarUrl?: string;
  @Column({ nullable: true }) bannerUrl?: string;

  // --- Skills Relation ---
  @ManyToMany(() => Skill, (skill) => skill.profiles, { cascade: ['insert'], eager: false })
  @JoinTable({ name: 'user_profile_skills', joinColumn: { name: 'profileId' }, inverseJoinColumn: { name: 'skillId' } })
  skills: Skill[];

  // --- Interests Relation ---
  @ManyToMany(() => Interest, (interest) => interest.profiles, { cascade: ['insert'], eager: false })
  @JoinTable({ name: 'user_profile_interests', joinColumn: { name: 'profileId' }, inverseJoinColumn: { name: 'interestId' } })
  interests: Interest[];

  // --- Work Experience Relation ---
  @OneToMany(() => WorkExperience, (experience) => experience.profile, { cascade: true, eager: false })
  workExperiences: WorkExperience[];

  // --- Portfolio Projects Relation ---
  @OneToMany(() => PortfolioProject, (portfolioProject) => portfolioProject.profile, {
    cascade: true, // If profile saved/deleted, cascade to portfolio projects
    eager: false, // Load only when requested
  })
  portfolioProjects: PortfolioProject[];
  // ---------------------------------

  @UpdateDateColumn()
  updatedAt: Date;
}