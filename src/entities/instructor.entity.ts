import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Instructor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'boolean' })
  availableForMentorship: boolean;
}
