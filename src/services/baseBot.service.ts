import { IBotInterface } from "./Interfaces/IBot.interface";
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bull';
import { activeBotQueue } from "config/constant";

export abstract class BaseBotService implements IBotInterface{
    private runningBotList = []
    constructor(@InjectQueue(activeBotQueue) private bot_queue: Queue){

    }
async RunBot(botInfo){
    console.log("🚀 ~ BaseBotService ~ RunBot ~ botInfo:", botInfo)
    try{
        const bot_queue = await this.bot_queue.add('start-challenge', botInfo)

        const newBot = {
            bot_id: botInfo.bot_id,
            bot_queue_id: bot_queue.id
          };
          
          this.runningBotList.push(newBot)
         
          return { message: 'Challenge Started. . . ', Challenge
            : botInfo.Challenge_type, Info: `Unique Job Id for the bot is : '${bot_queue.id}' ` }
    }
    catch(error){
        console.log("🚀 ~ BaseBotService ~ RunBot ~ error:", error)
    }

}
}