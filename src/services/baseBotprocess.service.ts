import { Process, Processor } from "@nestjs/bull";
import { IBotProcessInterface } from "./Interfaces/IBotProcess.interface";
import { Job } from "bull";
import { activeBotQueue } from "config/constant";
import { BaseAccountService } from "./baseAccount.service";
import { Inject } from "@nestjs/common";
import { IAccountInterface } from "./Interfaces/IAccount.interface";
import { IBotInterface } from "./Interfaces/IBot.interface";
import { format } from 'date-fns';
import { IEvaluationInterface } from "./Interfaces/IEvaluation.interface";

@Processor(activeBotQueue)
export abstract class BaseBotProcess implements IBotProcessInterface{
    public startTime;
    constructor(@Inject('IAccountInterface') public readonly IAccountInterface: IAccountInterface, @Inject('IBotInterface') public readonly IBotInterface: IBotInterface, @Inject('IEvaluationInterface') public readonly IEvaluationInterface: IEvaluationInterface){
        
    }

    @Process('start-challenge')
    async generate_Bot(botInfo: Job) {
        try {
            const formattedDate = format(new Date(), 'yyyy.MM.dd HH:mm');
            // console.log(formattedDate); // e.g., "2024.06.25 18:41"
            // this.startTime = Date();
            botInfo.data.challengeStartTime = formattedDate;
            const tempInfo = botInfo.data;
            botInfo.update(tempInfo)
            this.startChallenge(botInfo);
        }
        catch (error) {
            console.log("Error in generate bot ", error)
        }
    }
    abstract startChallenge(botInfo: Job);
    abstract connectPhase(botInfo: Job);
    async stopBot(botInfo:Job){
        try{
            this.IBotInterface.stopBot(botInfo);
        }
        catch(error){
            console.log("🚀 ~ BaseBotProcess ~ stopBot ~ error:", error)
            
        }
    }
}