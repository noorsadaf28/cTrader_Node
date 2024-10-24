import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Account } from './account.entity';

@Entity('daily_equities')
export class DailyEquity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  starting_equity: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  equity_date: Date;

  @ManyToOne(() => Account, (account) => account.equities)
  account: Account;
}
