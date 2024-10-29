import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ unique: true })
  key: string;

  @Column()
  ticket_id: number;

  @Column()
  account: number;

  @Column()
  type: string;

  @Column()
  symbol: string;

  @Column('decimal', { precision: 10, scale: 2 })
  volume: number;

  @Column('decimal', { precision: 10, scale: 2 })
  entry_price: number;

  @Column()
  entry_date: string;

  @Column({ nullable: true })
  take_profit: string;

  @Column({ nullable: true })
  stop_loss: string;

  @Column({ nullable: true })
  close_price: string;

  @Column({ nullable: true })
  close_date: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  profit: number;

  @Column()
  broker: string;

  @Column()
  open_reason: string;

  @Column({ nullable: true })
  close_reason: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @Column()
  magic_number: string;

  @Column({ nullable: true, type: 'int' })
  refund_percentage: number;
}
