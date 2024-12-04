import { IBotInterface } from "./Interfaces/IBot.interface";
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { activeBotQueue } from "config/constant";
import { Job } from "bull";
import { Inject } from "@nestjs/common";
import { IAccountInterface } from "./Interfaces/IAccount.interface";

export abstract class BaseBotService implements IBotInterface{
    private runningBotList = []
    constructor(@InjectQueue(activeBotQueue) private bot_queue: Queue, @Inject('IAccountInterface') public readonly IAccountInterface: IAccountInterface){

    }
async RunBot(botInfo){
    console.log("🚀 ~ BaseBotService ~ RunBot ~ botInfo:", botInfo)
    try{
      const accountResponse = await this.IAccountInterface.createAccountWithCTID(botInfo);
        console.log("🚀 ~ EvaluationBotProcess ~ startChallenge ~ accountResponse:", accountResponse)
        if(!accountResponse.traderLogin){
            return { message: 'Challenge not started. . . ', Challenge
              : botInfo.Challenge_type, Error:  accountResponse}
        }
        botInfo.traderLogin = accountResponse.traderLogin;
        botInfo.ctid = accountResponse.ctid;
        botInfo.ctidTraderAccountId = accountResponse.ctidTraderAccountId;
        botInfo.running = true;
        botInfo.interval = 10;
        botInfo.symbols = [];
        botInfo.symbolsSubscribed = [];
        const bot_queue = await this.bot_queue.add('start-challenge', botInfo)
        const newBot = {
            email: botInfo.email,
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
async stopBot(req){
    try{
        
        const jobs = await this.bot_queue.getJobs(['waiting', 'active', 'delayed', 'completed', 'failed']);
        for (const job of jobs) {
          const jobData = await job.data;
          //console.log("-------------jobData---------",jobData)

         if (jobData.email === req.email) {
            console.log("🔔  ~ found bot_id @StopBot:", jobData)

            await job.moveToCompleted('jobCompleted . . .', true);
            await job.remove();
            // removing botID and bot_unique_id in :Active botList[] 
            //const updatedBotList = await this.runningBotList.filter(bot => bot.bot_id !== bot_id)
            //this.runningBotList = updatedBotList
            //console.log("🚀 ~ Updated ~ Active botList:", this.runningBotList)

            //jobData.running = false;
            //await job.update({ running: false })
            //console.log("Job data of bot_id --------------------------------------: ", jobData)
            return {
              response: 'Success',
              message: `Bot with email: ${jobData.email} has been successfully removed.`,
            };
          }
        }

        return {
          response: 'Failure',
          message: `No active bot found with ID:`,
        };
    //console.log("🚀~ bot_id to delete @StopBot :", body.bot_id);
    }
    catch(error){
    console.log("🚀 ~ BaseBotService ~ stopBot ~ error:", error)
    }
}
async stopAllBots() {
    try {
      const activeIds_ = await this.ActiveBotIds()
      console.log("🚀 ~ BaseBotServices ~ StopAllBots ~ activeIds @StopAllBot:", activeIds_)

      if (activeIds_.Bot_id) 
        {
        const bot_id = activeIds_.Bot_id;
        console.log("🚀 ~ ~ bot_id @StopAllBot:", bot_id)
        const jobs = await this.bot_queue.getJobs(['waiting', 'active', 'delayed', 'completed', 'failed']);

        for (const job of jobs) {
          const jobData = await job.data;
          const openOrdersData = jobData.openOrders;
          // console.log("🚀StopAllBots ~ openOrdersData:", await job.data)
        }
        // remove active bot from runningBot Array
        await this.runningBotList.splice(0, this.runningBotList.length);
        await this.bot_queue.obliterate();
        // console.log("🚀 ~ Updated BotList@ StopAllBots :", this.runningBotList)

        return { response: 'Success', message: `All Bots with Job id ${bot_id} Stopped successfully !` }
      }
      return { message: `No Active Bot Present !` }

    }
    catch (error) {
      console.log("🚀 ~ BaseBotServices ~ error: @StopAllBot", error)
      return { response: 'Failure', message: 'Error in removing all bots !' }
    }

  }
  async ActiveBotIds() {
    try{
      const jobs = await this.bot_queue.getJobs(['active', 'completed']);
      const active_Bots = []
  
      if (jobs.length > 0) {
        for (const job of jobs) 
        {
          //console.log("🚀 ActiveBotIds ~ job:", job)
         active_Bots.push(job.id)
        }
        console.log("🚀 ~ ~ active_Bots:", active_Bots)
        return { response: `Active Ids`, Bot_id: ` ${active_Bots}` };
  
      }
      console.log(" 🚀 ~ No active bot present")
      return { response: `No Active Bot present` };
    }
    catch(error){
    console.log("🚀 ~ BaseBotService ~ ActiveBotIds ~ error:", error)
    }
  }
}