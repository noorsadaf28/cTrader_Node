export interface IConnectionInterface{
    onModuleInit();
    connectToCTrader();
    handleMessage(data);
}