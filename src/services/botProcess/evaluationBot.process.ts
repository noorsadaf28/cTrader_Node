import { Job } from "bull";
import { PhaseSettings } from "src/data/rulesData";
import { BaseBotProcess } from "src/services/baseBotprocess.service";

export class EvaluationBotProcess extends BaseBotProcess{
    
    async startChallenge(botInfo:Job) {
        console.log("bot detail--------", botInfo.data);
        this.connectPhase(botInfo);
        const accountResponse = this.IAccountInterface.createAccountWithCTID(botInfo.data);
        if(!accountResponse.traderLogin){
            this.handleBot(botInfo);
        }
    }
    async createAccount(botData){

    }
    async connectPhase(botInfo:Job) {
        try{
            const phaseSettings = PhaseSettings[botInfo.data.Phase];
            const botData = botInfo.data;
            const connectedPhaseData = Object.assign({}, botData, phaseSettings);
            const tempInfo = connectedPhaseData;
            botInfo.update(tempInfo)
            console.log("🚀 ~ EvaluationBotProcess ~ connectPhase ~ botInfo:", botInfo.data)
        }
        catch(error){
            console.log("🚀 ~ EvaluationBotProcess ~ connectPhase ~ error:", error)
        }
    }
    async handleBot(botInfo:Job){
        this.stopBot(botInfo);
    }
}