import { Job } from "bull";
import { PhaseSettings } from "src/data/rulesData";
import { BaseBotProcess } from "src/services/baseBotprocess.service";

export class EvaluationBotProcess extends BaseBotProcess{
    
    async startChallenge(botInfo:Job) {
        console.log("bot detail--------", botInfo.data);
        const phaseConnection = this.connectPhase(botInfo);
        if(phaseConnection){
            this.sendOnInit(botInfo);
            this.runOrderPolling(botInfo)
        }
        
    }
    async connectPhase(botInfo:Job) {
        try{
            const phaseSettings = PhaseSettings[botInfo.data.Phase];
            if(phaseSettings){
                const botData = botInfo.data;
                const connectedPhaseData = Object.assign({}, botData, phaseSettings);
                connectedPhaseData.max_daily_currency = parseInt(connectedPhaseData.Initial_balance)*(connectedPhaseData.max_daily_loss/100)
                connectedPhaseData.max_total_currency = parseInt(connectedPhaseData.Initial_balance)*(connectedPhaseData.max_loss/100)
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
        try{

            botInfo.data.status = "Active";
            botInfo.data.request_type = "OnInit";
            botInfo.data.accountId = botInfo.data.traderLogin;
            const tempInfo = botInfo.data;
            botInfo.update(tempInfo);
            console.log("🚀 ~ EvaluationBotProcess ~ sendOnInit ~ botInfo:", botInfo.data)

            this.IEvaluationInterface.rulesEvaluation(botInfo)
        }
        catch(error){
            console.log("🚀 ~ EvaluationBotProcess ~ sendOnInit ~ error:", error)
            
        }
    }
    async runOrderPolling(botInfo:Job){
        //console.log("🚀 ~ EvaluationBotProcess ~ runOrderPolling ~ botInfo:", botInfo)
        try{
            while(await botInfo.data.running){
                const {interval} = await botInfo.data;
                this.IOrderInterface.pollPositions(botInfo);
                this.IEvaluationInterface.subscribeToSpotQuotes(botInfo);
                await new Promise(resolve => setTimeout(resolve, interval * 1000));
            }
        }
        catch(error){
            console.log("🚀 ~ EvaluationBotProcess ~ runOrderPolling ~ error:", error)
            
        }
    }
    async sendWon(botInfo:Job){
        try{

            botInfo.data.status = "Won";
            botInfo.data.request_type = "Won";
            botInfo.data.accountId = botInfo.data.traderLogin;
            const tempInfo = botInfo.data;
            botInfo.update(tempInfo);
            console.log("🚀 ~ EvaluationBotProcess ~ sendWon ~ botInfo:", botInfo.data)

            this.IEvaluationInterface.rulesEvaluation(botInfo)
            if(botInfo.data.phase === process.env.Phase_1){
                this.switchToPhase2(botInfo);
            }
        }
        catch(error){
            console.log("🚀 ~ EvaluationBotProcess ~ sendWon ~ error:", error)
            
        }
    }
    async sendTotalKOD(botInfo:Job){
        try{

            botInfo.data.status = "Failed";
            botInfo.data.request_type = "TotalKOD";
            botInfo.data.daily_kod = "false";
            botInfo.data.accountId = botInfo.data.traderLogin;
            const tempInfo = botInfo.data;
            botInfo.update(tempInfo);
            console.log("🚀 ~ EvaluationBotProcess ~ sendWon ~ botInfo:", botInfo.data)

            this.IEvaluationInterface.rulesEvaluation(botInfo)
        }
        catch(error){
            console.log("🚀 ~ EvaluationBotProcess ~ sendWon ~ error:", error)
            
        }
    }
    async switchToPhase2(botInfo:Job){
        try{
            botInfo.data.phase = process.env.Phase_2;
            const tempData = botInfo.data;
            botInfo.update(tempData);
            this.startChallenge(botInfo)
        }
        catch(error){
            console.log("🚀 ~ EvaluationBotProcess ~ switchToPhase2 ~ error:", error)
        }
    }
}