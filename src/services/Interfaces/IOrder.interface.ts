export interface IOrderInterface {
  key: string;
  ticket_id: number;
  account: number;
  type: string;
  symbol: string;
  volume: number;
  entry_price: number;
  entry_date: string;
  take_profit?: string;
  stop_loss?: string;
  close_price?: number;
  close_date?: string;
  profit?: number;
  broker: string;
  open_reason: string;
  close_reason?: string;
  magic_number: string;
  refund_percentage?: number;
}
