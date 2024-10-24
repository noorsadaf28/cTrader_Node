export interface IOrderService {
    fetchOpenPositions(login?: number): Promise<any[]>;
    fetchClosedPositions(from: string, to: string, login?: number): Promise<any[]>;
    updatePositionsData(): Promise<void>;
  }
  