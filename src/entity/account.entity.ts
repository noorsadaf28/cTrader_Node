import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Challenge } from './challenge.entity';
import { DailyEquity } from './equity.entity';
import { Order } from './order.entity';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  traderLogin: string;

  @Column()
  accessRights: string;

  @Column()
  accountType: string;

  @Column('decimal', { precision: 12, scale: 2 })
  balance: number;

  @Column()
  brokerName: string;

  @Column('json', { nullable: true })
  contactDetails: object;

  @Column()
  depositCurrency: string;

  @Column()
  groupName: string;

  @Column()
  hashedPassword: string;

  @Column()
  leverageInCents: number;

  @Column()
  totalMarginCalculationType: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  preferredLanguage: string;

  @Column({ nullable: true })
  ctidTraderAccountId: number;

  @Column({ nullable: true })
  userId: number;

  @Column({ nullable: true })
  token: string;  // Store the JWT token

  @OneToMany(() => Challenge, (challenge) => challenge.account)
  challenges: Challenge[];

  @OneToMany(() => DailyEquity, (equity) => equity.account)
  equities: DailyEquity[];

  @OneToMany(() => Order, (order) => order.account)
  orders: Order[];
}
