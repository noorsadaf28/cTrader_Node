import { Job } from "bull";
import { PhaseSettings } from "src/data/rulesData";
import { BaseBotProcess } from "src/services/baseBotprocess.service";
import * as dayjs from 'dayjs';
export class EvaluationBotProcess extends BaseBotProcess {

    async startChallenge(botInfo: Job) {
        console.log("bot detail--------", botInfo.data);
        const phaseConnection = this.connectPhase(botInfo);
        if (phaseConnection) {
            this.sendOnInit(botInfo);
            this.runOrderPolling(botInfo)
        }

    }
    async connectPhase(botInfo: Job) {
        try {
            const phaseSettings = PhaseSettings[botInfo.data.Phase];
            if (phaseSettings) {
                const botData = botInfo.data;
                const connectedPhaseData = Object.assign({}, botData, phaseSettings);
                connectedPhaseData.max_daily_currency = parseInt(connectedPhaseData.Initial_balance) * (connectedPhaseData.max_daily_loss / 100)
                connectedPhaseData.max_total_currency = parseInt(connectedPhaseData.Initial_balance) * (connectedPhaseData.max_loss / 100)
                connectedPhaseData.consistencyPercent = (parseInt(connectedPhaseData.consistency_value )/ 100)
                connectedPhaseData.profitCurrency = parseInt(connectedPhaseData.Initial_balance) * (connectedPhaseData.profit_target / 100)
                connectedPhaseData.challenge_begins = Date
                const tempInfo = connectedPhaseData;
                botInfo.update(tempInfo)
                console.log("🚀 ~ EvaluationBotProcess ~ connectPhase ~ botInfo:", botInfo.data)
                return true;
            }
            else {
                return false;
            }
        }
        catch (error) {
            console.log("🚀 ~ EvaluationBotProcess ~ connectPhase ~ error:", error)
        }
    }
    async handleBot(botInfo: Job) {
        this.stopBot(botInfo);
    }
    async sendOnInit(botInfo: Job) {
        try {

            botInfo.data.status = "Active";
            botInfo.data.request_type = "OnInit";
            botInfo.data.accountId = botInfo.data.traderLogin;
            botInfo.data.challenge_begins = (dayjs(Date.now()).format('YYYY-MM-DD')).toString();
            botInfo.data.daily_kod = "false";
            botInfo.data.total_kod = "false";
            botInfo.data.challenge_won = "false";
            botInfo.data.challenge_ends = "";
            botInfo.data.consistency_kod = "false";
            const tempInfo = botInfo.data;
            botInfo.update(tempInfo);
            console.log("🚀 ~ EvaluationBotProcess ~ sendOnInit ~ botInfo:", botInfo.data)

            this.IEvaluationInterface.rulesEvaluation(botInfo)
        }
        catch (error) {
            console.log("🚀 ~ EvaluationBotProcess ~ sendOnInit ~ error:", error)

        }
    }
    async runOrderPolling(botInfo: Job) {
        //console.log("🚀 ~ EvaluationBotProcess ~ runOrderPolling ~ botInfo:", botInfo)
        try{
            while(await botInfo.data.running){
                const isBotActive = await this.IBotInterface.checkBotStatus(botInfo);
                console.log("🚀 ~ isBotActive:", isBotActive)

                if (!isBotActive) {
                    console.log(" ⛔️ Bot Stopped")
                    return { response: ` ❌ Bot Not Present . . . ` }
                }
                const {interval} = await botInfo.data;
                this.IOrderInterface.pollPositions(botInfo);
                this.IEvaluationInterface.subscribeToSpotQuotes(botInfo);
                await new Promise(resolve => setTimeout(resolve, interval * 1000));
            }
        }
        catch (error) {
            console.log("🚀 ~ EvaluationBotProcess ~ runOrderPolling ~ error:", error)

        }
    }
    async sendWon(botInfo: Job) {
        try {

            botInfo.data.status = "Won";
            botInfo.data.request_type = "Won";
            botInfo.data.accountId = botInfo.data.traderLogin;
            const tempInfo = botInfo.data;
            botInfo.update(tempInfo);
            console.log("🚀 ~ EvaluationBotProcess111111111 ~ sendWon ~ botInfo:", botInfo.data)


            botInfo.data.challenge_won = "true";
            botInfo.data.challenge_ends = dayjs(Date.now()).format('YYYY-MM-DD');
            botInfo.data.daily_kod = "false";
            botInfo.data.total_kod = "false";

         
        } catch (error) {
            console.log("🚀 ~ BaseBotProcess ~ sendWon ~ error:", error);
        }
    }
        async sendDailyKOD(botInfo:Job){
        try{
          botInfo.data.request_type = "DailyKOD";
          botInfo.data.status = "Failed";
          botInfo.data.challenge_won = "false";
          botInfo.data.challenge_ends = dayjs(Date.now()).format('YYYY-MM-DD');
          botInfo.data.daily_kod = "true",
          botInfo.data.total_kod = "false"
          await this.IEvaluationInterface.rulesEvaluation(botInfo);
        //   await this.stopChallenge(botInfo)
        }
        catch(error){
          console.log("🚀 ~ BaseEvaluationService ~ sendDailyKOD ~ error:", error)
        }
      }

    async sendTotalKOD(botInfo: Job) {
        try {

            botInfo.data.status = "Failed";
            botInfo.data.request_type = "TotalKOD";
            botInfo.data.daily_kod = "false";
            botInfo.data.accountId = botInfo.data.traderLogin;
   
            

            this.IEvaluationInterface.rulesEvaluation(botInfo)
        }
        catch (error) {
            console.log("🚀 ~ EvaluationBotProcess ~ sendToTalKOD ~ error:", error)

        }
    }
   
}