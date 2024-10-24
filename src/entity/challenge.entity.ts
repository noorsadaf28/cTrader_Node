import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Account } from './account.entity';

@Entity('challenges')
export class Challenge {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  phase: string;

  @Column()
  max_daily_loss: number;

  @Column()
  max_loss: number;

  @Column()
  profit_target: number;

  @Column()
  status: string;

  @ManyToOne(() => Account, (account) => account.challenges)
  account: Account;
}
