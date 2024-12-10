import { IBotInterface } from "./Interfaces/IBot.interface";
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { activeBotQueue } from "config/constant";
import { Job } from "bull";
import { Inject } from "@nestjs/common";
import { IAccountInterface } from "./Interfaces/IAccount.interface";
import { IEvaluationInterface } from "./Interfaces/IEvaluation.interface";

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
async stopBot(body) {
  console.log("Body received for stopBot:", body);

  try {
      const { email } = body;

      if (!email) {
          console.error("Email is missing in the request body.");
          return { response: 'Failure', message: 'Please enter a valid email!' };
      }

      const jobs = await this.bot_queue.getJobs(['waiting', 'active', 'delayed', 'completed', 'failed']);
      console.log(`Total jobs retrieved from queue: ${jobs.length}`);

      for (const job of jobs) {
          try {
              const jobData = job.data;

              // Validate job data
              if (!jobData || !jobData.email) {
                  console.error(`Job data is missing or corrupted for job ID: ${job.id}`);
                  continue; // Skip this job
              }

              if (jobData.email === email) {
                  console.log("🔔 Found bot with email:", jobData.email);

                  // Update the job data
                  jobData.running = false;
                  const updatedData = { ...jobData }; // Retain all fields
                  await job.update(updatedData);
                  console.log(`Job ID ${job.id} updated successfully.`);

                  // Check the state of the job
                  const state = await job.getState();
                  console.log(`🚀 Current state of job ID ${job.id}: ${state}`);

                  if (state === 'active') {
                      console.log("🚀 Attempting to move job to completed...");
                      await job.moveToCompleted('Job completed successfully.', true);
                      console.log("🚀 Job moved to completed successfully.");
                  } else {
                      console.warn(`Job ID ${job.id} is not in an active state (current state: ${state}).`);
                  }

                  // Remove the job
                  await job.remove();
                  console.log(`🚀 Job ID ${job.id} removed successfully.`);
                  console.log("🛑 BOT STOPPED");

                  // Update the running bot list
                  this.runningBotList = this.runningBotList.filter(bot => bot.email !== email);
                  console.log("🚀 Updated active bot list:", this.runningBotList);

                  return {
                      response: 'Success',
                      message: `Bot with email: ${email} has been successfully removed.`,
                  };
              }
          } catch (innerError) {
              console.error(`Error processing job ID ${job.id}:`, innerError);
          }
      }

      console.warn(`No active bot found with email: ${email}.`);
      return {
          response: 'Failure',
          message: `No active bot found with email: ${email}.`,
      };
  } catch (error) {
      console.error('Error in stopBot function:', error);

      return {
          response: 'Failure',
          message: 'An error occurred while trying to stop the bot.',
      };
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
  async checkBotStatus(botInfo: Job) {
    try{
      const { email } = botInfo.data;
      //console.log("🚀 ~checkBotStatus  ~ bot_id:", bot_id)
  
      const jobs_ = await this.bot_queue.getJobs(['active']['completed']);
      let isActive = true;
  
      if (jobs_) {
        for (const job of jobs_) {
          //console.log("🚀 ~ BaseBotServices ~ checkBotStatus ~ job:", job)
  
          if (job.data.email == email) {
            
            //console.log(' this id is present @checkBotStatus . . . . .', job.data)
            return true;
          }
        }
  
      }
      // console.log(` @checkBotStatus  : [${bot_id}] not present . . . . . .`)
      console.log(`@checkBotStatus: [${email}] not present `);
      console.log(`❗️ No Bot Present with email ${email} `);
      // console.log(`. . . . .No Bot Present with id  ${bot_id} . . . . . .`)
        isActive = false
        return isActive;
    }
    catch(error){
    console.log("🚀 ~ BaseBotService ~ checkBotStatus ~ error:", error)
    }
    

  }
  
}