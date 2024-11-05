import { BaseBotProcess } from "src/services/baseBotprocess.service";

export class EvaluationBotProcess extends BaseBotProcess{
    
    async startChallenge(botInfo: any) {
        console.log("bot detail--------", botInfo.data);

    }
    async createAccount(botData){

    }
}