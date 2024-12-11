export interface IBotProcessInterface{
    generate_Bot(botInfo);
    startChallenge(botInfo);
    connectPhase(botInfo);
    stopBot(botInfo);
}