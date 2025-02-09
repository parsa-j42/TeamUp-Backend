import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  ManyToOne,
} from 'typeorm';
import { Program } from '@entities/program.entity';
import { Student } from '@entities/student.entity';
import { Instructor } from '@entities/instructor.entity';
import { Alumni } from '@entities/alumni.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @ManyToOne(() => Program, { nullable: true })
  programs: Program[];

  @OneToOne(() => Student, { nullable: true })
  role: Student | Instructor | Alumni;
}
