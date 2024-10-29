import { IBotInterface } from "./Interfaces/IBot.interface";
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bull';
import { activeBotQueue } from "config/constant";

export abstract class BaseBotService implements IBotInterface{
    constructor(@InjectQueue(activeBotQueue) private bot_queue: Queue){

    }
async RunBot(req){
    try{

        const myQueue = new Queue('');
        
        async function addJobs() {
          await myQueue.add('myJobName', { foo: 'bar' });
          await myQueue.add('myJobName', { qux: 'baz' });
        }
        
        await addJobs();
    }
    catch(error){
        console.log("🚀 ~ BaseBotService ~ RunBot ~ error:", error)
    }

}
}