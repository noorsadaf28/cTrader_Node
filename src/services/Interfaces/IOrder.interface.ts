export interface IOrderInterface {
  findOrderByTicketId(ticket_id: number): Promise<any>;
  createOrder(openOrderData: any): Promise<any>;
  updateOrderWithCloseData(closedOrderData: any): Promise<any>;
  pollPositions(botInfo); // Added for polling functionality
}
