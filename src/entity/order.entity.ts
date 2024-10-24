import { Account } from "./account.entity";
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  login: number;

  @Column({ unique: true })
  positionId: number;

  @Column()
  entryPrice: string;

  @Column()
  direction: string;

  @Column('decimal', { precision: 10, scale: 2 })
  volume: number;

  @Column()
  symbol: string;

  @Column('decimal', { precision: 10, scale: 2 })
  commission: number;

  @Column('decimal', { precision: 10, scale: 2 })
  swap: number;

  @Column()
  bookType: string;

  @Column('decimal', { precision: 10, scale: 2 })
  usedMargin: number;

  @Column()
  openTimestamp: string;

  @Column({ nullable: true })
  closeTimestamp: string;

  @Column({ nullable: true })
  closePrice: string;

  @Column({ nullable: true })
  pnl: number;

  @ManyToOne(() => Account, (account) => account.orders)
  account: Account;
}
