import { Job } from "bull";
import { PhaseSettings } from "src/data/rulesData";
import { BaseBotProcess } from "src/services/baseBotprocess.service";

export class EvaluationBotProcess extends BaseBotProcess{
    
    async startChallenge(botInfo:Job) {
        console.log("bot detail--------", botInfo.data);
        const phaseConnection = this.connectPhase(botInfo);
        if(phaseConnection){
            this.sendOnInit(botInfo);
        }
        
    }
    async connectPhase(botInfo:Job) {
        try{
            const phaseSettings = PhaseSettings[botInfo.data.Phase];
            if(phaseSettings){
                const botData = botInfo.data;
                const connectedPhaseData = Object.assign({}, botData, phaseSettings);
                const tempInfo = connectedPhaseData;
                botInfo.update(tempInfo)
                console.log("🚀 ~ EvaluationBotProcess ~ connectPhase ~ botInfo:", botInfo.data)
                return true;
            }
            else{
                return false;
            }
        }
        catch(error){
            console.log("🚀 ~ EvaluationBotProcess ~ connectPhase ~ error:", error)
        }
    }
    async handleBot(botInfo:Job){
        this.stopBot(botInfo);
    }
    async sendOnInit(botInfo:Job){
        this.stopBot(botInfo);
    }
}