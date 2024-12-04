export interface IBotInterface{
    RunBot(body)
    stopBot(botInfo)
    stopAllBots()
    ActiveBotIds()
    checkBotStatus(botInfo)
}