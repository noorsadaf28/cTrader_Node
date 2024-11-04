import { Process, Processor } from "@nestjs/bull";
import { IBotProcessInterface } from "./Interfaces/IBotProcess.interface";
import { Job } from "bullmq";
import { activeBotQueue } from "config/constant";
@Processor(activeBotQueue)
export abstract class BaseBotProcess implements IBotProcessInterface{
    public startTime: number;
    constructor(){
        
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
    abstract startChallenge(botInfo: any);
    abstract createAccount(botData);
}