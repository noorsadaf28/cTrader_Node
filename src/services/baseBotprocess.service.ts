import { Process, Processor } from "@nestjs/bull";
import { IBotProcessInterface } from "./Interfaces/IBotProcess.interface";
import { Job } from "bull";
import { activeBotQueue } from "config/constant";
import { BaseAccountService } from "./baseAccount.service";
import { Inject } from "@nestjs/common";
import { IAccountInterface } from "./Interfaces/IAccount.interface";
import { IBotInterface } from "./Interfaces/IBot.interface";
@Processor(activeBotQueue)
export abstract class BaseBotProcess implements IBotProcessInterface{
    public startTime: number;
    constructor(@Inject('IAccountInterface') public readonly IAccountInterface: IAccountInterface, @Inject('IBotInterface') public readonly IBotInterface: IBotInterface){
        
    }

    @Process('start-challenge')
    async generate_Bot(botInfo: Job) {
        try {
            this.startTime = Date.now();
            this.startChallenge(botInfo);
        }
        catch (error) {
            console.log("Error in generate bot ", error)
        }
    }
    abstract startChallenge(botInfo: Job);
    abstract createAccount(botData);
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