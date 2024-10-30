export interface IOrderInterface {
  findOrderByTicketId(ticket_id: number);
  createOrder(openOrderData);
  updateOrderWithCloseData(closedOrderData);
}
