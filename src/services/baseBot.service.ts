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
    //  if (this.runningBotList.length > 0) {
    //     const existingBot = this.runningBotList.find(bot => bot.email === botInfo.email);
    //     if (existingBot) {
    //       console.log("🚀 Botwith id exists already . . .", existingBot)
  
    //       return {
    //          status: 'error',
    //         message: `Bot with email ${botInfo.email} already exists`
    //       };
    //     }
    //   }
      const accountResponse = await this.IAccountInterface.createAccountWithCTID(botInfo);
        console.log("🚀 ~ EvaluationBotProcess ~ startChallenge ~ accountResponse:", accountResponse)
        if(!accountResponse.traderLogin){
            return { message: 'Challenge not started. . . ', Challenge
              : botInfo.Challenge_type, Error:  accountResponse}
        }
        botInfo.Initial_balance=botInfo.Initial_balance*100;
        botInfo.traderLogin = accountResponse.traderLogin;
        botInfo.ctid = accountResponse.ctid;
        botInfo.ctidTraderAccountId = accountResponse.ctidTraderAccountId;
        botInfo.running = true;
        botInfo.interval = 10;
        botInfo.symbols = [];
        botInfo.symbolsSubscribed = [];
        const bot_queue = await this.bot_queue.add('start-challenge', botInfo)
        const newBot = {
            login: botInfo.traderLogin,
            bot_queue_id: bot_queue.id
          };
          
          await this.runningBotList.push(newBot)
         
          return { message: 'Challenge Started. . . ', Challenge
            : botInfo.Challenge_type, Info: `Unique Job Id for the bot is : '${bot_queue.id}' ` }
    }
    catch(error){
        console.log("🚀 ~ BaseBotService ~ RunBot ~ error:", error)
    }

}
async stopBot(body) {
  console.log("🚀 Body received for stopBot:", JSON.stringify(body, null, 2));

  try {
      const { traderLogin } = body;
      console.log(`🔍 Found this traderLogin: ${traderLogin}`);
      
      // Validate email
      if (!traderLogin) {
          console.error("TraderLogin is missing in the request body.");
          return { response: 'Failure', message: 'Please enter a valid traderLogin!' };
      }
      console.log(`🔍 Validating traderLogin: ${traderLogin}`);


      const jobs = await this.bot_queue.getJobs(['waiting', 'active', 'delayed', 'completed', 'failed']);
      console.log(`Total jobs retrieved from queue: ${jobs.length}`);

      for (const job of jobs) {
          try {
              const jobData = job.data;

              // Validate job data
              if (!jobData || !jobData.traderLogin) {
                  console.error(`Job data is missing or corrupted for job ID: ${job.id}`);
                  continue; // Skip this job
              }
              console.log(`🔍 Checking job ID: ${job.id}, TraderLogin: ${jobData.traderLogin}`);


              if (jobData.traderLogin === traderLogin) {
                     console.log(`✅ Found bot with TraderLogin: ${jobData.traderLogin}, Job ID: ${job.id}`);

             // Update job data to mark it as not running
          jobData.running = false;
          await job.update({ ...jobData, status: 'processed' });
          console.log(`✏️ Job data updated for Job ID ${job.id}:`, JSON.stringify(jobData, null, 2));


                  // Check the state of the job
                  const state = await job.getState();
                  console.log(`🚀 Current state of job ID ${job.id}: ${state}`);

                  // Move to completed if the state is active
                  if (state === 'active') {
                      console.log("🚀 Attempting to move job to completed...");
                      await job.moveToCompleted('Job completed successfully.', true);
                      console.log(`✅ Job ID ${job.id} moved to completed.`);
                  } else {
                    console.warn(`⚠️ Job ID ${job.id} is not in an active state. Current state: ${state}`);
                  }

                            // Remove the job from the queue
          console.log(`🗑️ Attempting to remove job ID ${job.id}...`);
                  await job.remove();
                  console.log(`🚀 Job ID ${job.id} removed successfully.`);
                  console.log("🛑 BOT STOPPED");

                  // Update the running bot list
                    // Remove the bot from the running bot list
          console.log(`📉 Updating running bot list. Removing TraderLogin: ${traderLogin}`);
                  this.runningBotList = this.runningBotList.filter(bot => bot.traderLogin !== traderLogin);
                  console.log("🚀 Updated active bot list:", this.runningBotList);

                  return {
                      response: 'Success',
                      message: `Bot with traderLogin: ${traderLogin} has been successfully removed.`,
                  };
              }
          } catch (innerError) {
              console.error(`Error processing job ID ${job.id}:`, innerError);
          }
      }

      console.warn(`No active bot found with traderLogin: ${traderLogin}.`);
      return {
          response: 'Failure',
          message: `No active bot found with traderLogin: ${traderLogin}.`,
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
    console.log("🚀 Starting ActiveBotIds function...");
    try{
      const jobs = await this.bot_queue.getJobs(['active', 'completed']);
      const active_Bots = []
  
      if (jobs.length > 0) {
        for (const job of jobs) 
        {  console.log("🔍 Processing Job ID:", job.id);
          //console.log("🚀 ActiveBotIds ~ job:", job)
          // Log job data for debugging purposes
        console.log("📦 Job Data:", JSON.stringify(job.data, null, 2));
         active_Bots.push(job.id)
         console.log("✅ Added Job ID to active_Bots:", job.id);

        }
        console.log("🚀 ~ ~ active_Bots:", active_Bots)
        return { response: `Active Ids`, Bot_id: ` ${active_Bots}` };
  
      }
      console.warn(" 🚀 ~ No active bot present")
      return { response: `No Active Bot present` };
    }
    catch(error){
    console.log("🚀 ~ BaseBotService ~ ActiveBotIds ~ error:", error)
    }
  }
  async checkBotStatus(botInfo: Job) {
    try{
      const { traderLogin } = botInfo.data;
      //console.log("🚀 ~checkBotStatus  ~ bot_id:", bot_id)
      // Validate that traderLogin exists
    if (!traderLogin) {
      console.error("❌ traderLogin is missing in the botInfo data.");
      return false;
    }
    console.log(`🔍 Checking status for traderLogin: ${traderLogin}`);
  // Fetch jobs from the bot queue in 'active' or 'completed' states
      const jobs_ = await this.bot_queue.getJobs(['active']['completed']);
      console.log("📋 Total jobs fetched from queue:", jobs_.length);
      let isActive = true;
  
      if (jobs_) {
        for (const job of jobs_) {
          console.log(`🔍 Inspecting Job ID: ${job.id}`);
          //console.log("🚀 ~ BaseBotServices ~ checkBotStatus ~ job:", job)
  // Log job data for debugging purposes
  console.log("📦 Job Data:", JSON.stringify(job.data, null, 2));
          if (job.data.traderLogin === traderLogin) {
            console.log(`✅ Bot is active for traderLogin: ${traderLogin}, Job ID: ${job.id}`);
            //console.log(' this id is present @checkBotStatus . . . . .', job.data)
            return true;
          }
        }
  
      }
      // If no matching job is found
    console.warn(`⚠️ No active or completed bot found for traderLogin: ${traderLogin}`);
    isActive = false;

    console.log(`❗️ Bot is NOT active for traderLogin: ${traderLogin}`);
    return isActive;
    }
    catch(error){
    console.error("🚀 ~ BaseBotService ~ checkBotStatus ~ error:", error)
    return false;
    }
    

  }
  
}