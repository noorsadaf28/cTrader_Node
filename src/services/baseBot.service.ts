import { IBotInterface } from "./Interfaces/IBot.interface";
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { activeBotQueue } from "config/constant";
import { Job } from "bull";
import { Inject } from "@nestjs/common";
import { IAccountInterface } from "./Interfaces/IAccount.interface";
import { IEvaluationInterface } from "./Interfaces/IEvaluation.interface";

export abstract class BaseBotService implements IBotInterface {
  private runningBotList = []
  constructor(@InjectQueue(activeBotQueue) private bot_queue: Queue, @Inject('IAccountInterface') public readonly IAccountInterface: IAccountInterface) {

  }
  async RunBot(botInfo) {
    console.log("🚀 ~ BaseBotService ~ RunBot ~ botInfo:", botInfo)
    try {
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
      if (!accountResponse.traderLogin) {
        return {
          message: 'Challenge not started. . . ', Challenge
            : botInfo.Challenge_type, Error: accountResponse
        }
      }
      botInfo.Initial_balance = botInfo.Initial_balance * 100;
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

      return {
        message: 'Challenge Started. . . ', Challenge
          : botInfo.Challenge_type, Info: `Unique Job Id for the bot is : '${bot_queue.id}' `
      }
    }
    catch (error) {
      console.log("🚀 ~ BaseBotService ~ RunBot ~ error:", error)
    }

  }
  // async stopBot(body) {
  //   console.log("🚀 Body received for stopBot:", JSON.stringify(body, null, 2));

  //   try {
  //     const { traderLogin } = body;
  //     console.log(`🔍 Found this traderLogin: ${traderLogin}`);

  //     // Validate email
  //     if (!traderLogin) {
  //       console.error("TraderLogin is missing in the request body.");
  //       return { response: 'Failure', message: 'Please enter a valid traderLogin!' };
  //     }
  //     console.log(`🔍 Validating traderLogin: ${traderLogin}`);


  //     const jobs = await this.bot_queue.getJobs(['waiting', 'active', 'delayed', 'completed', 'failed']);
  //     console.log(`Total jobs retrieved from queue: ${jobs.length}`);

  //     for (const job of jobs) {
  //       try {
  //         const jobData = job.data;

  //         // Validate job data
  //         if (!jobData || !jobData.traderLogin) {
  //           console.error(`Job data is missing or corrupted for job ID: ${job.id}`);
  //           continue; // Skip this job
  //         }
  //         console.log(`🔍 Checking job ID: ${job.id}, TraderLogin: ${jobData.traderLogin}`);

  //         //traderLogin Should be string
  //         if (String(jobData.traderLogin) === String(traderLogin)) {
  //           console.log(`✅ Found bot with TraderLogin: ${jobData.traderLogin}, Job ID: ${job.id}`);

  //           // Update job data to mark it as not running
  //           jobData.running = false;
  //           await job.update({ ...jobData, status: 'processed' });
  //           console.log(`✏️ Job data updated for Job ID ${job.id}:`, JSON.stringify(jobData, null, 2));


  //           // Check the state of the job
  //           const state = await job.getState();
  //           console.log(`🚀 Current state of job ID ${job.id}: ${state}`);

  //           // Move to completed if the state is active
  //           if (state === 'active') {
  //             console.log("🚀 Attempting to move job to completed...");
  //             await job.moveToCompleted('Job completed successfully.', true);
  //             console.log(`✅ Job ID ${job.id} moved to completed.`);
  //           } else {
  //             console.warn(`⚠️ Job ID ${job.id} is not in an active state. Current state: ${state}`);
  //           }

  //           // Remove the job from the queue
  //           console.log(`🗑️ Attempting to remove job ID ${job.id}...`);
  //           await job.remove();
  //           console.log(`🚀 Job ID ${job.id} removed successfully.`);
  //           console.log("🛑 BOT STOPPED");

  //           // Update the running bot list
  //          // Update the running bot list
  //         console.log(`📉 Updating running bot list. Removing TraderLogin: ${traderLogin}`);
  //         console.log("🚀 Active bot list before Updation:", JSON.stringify(this.runningBotList, null, 2))
  //         this.runningBotList = this.runningBotList.filter(
  //           bot => String(bot.login) !== String(traderLogin)
  //         );
  //         console.log("🚀 Updated active bot list:", JSON.stringify(this.runningBotList, null, 2));

  //         return {
  //           response: 'Success',
  //           message: `Bot with traderLogin: ${traderLogin} has been successfully stopped.`,
  //         };
  //         }
  //       } catch (innerError) {
  //         console.error(`Error processing job ID ${job.id}:`, innerError);
  //       }
  //     }

  //     console.warn(`No active bot found with traderLogin: ${traderLogin}.`);
  //     return {
  //       response: 'Failure',
  //       message: `No active bot found with traderLogin: ${traderLogin}.`,
  //     };
  //   } catch (error) {
  //     console.error('Error in stopBot function:', error);

  //     return {
  //       response: 'Failure',
  //       message: 'An error occurred while trying to stop the bot.',
  //     };
  //   }
  // }
  async stopBot(body) {
    // console.log("body", body);

    console.log("Body received for stopBot:", body);

    try {
        const { traderLogin } = body;
        console.log(`🔍 Found this traderLogin: ${traderLogin}`);
        if (!traderLogin) {
            console.error("TraderLogin is missing in the request body.");
            return { response: 'Failure', message: 'Please enter a valid email!' };
        }

        const jobs = await this.bot_queue.getJobs(['waiting', 'active', 'delayed', 'completed', 'failed']);
        console.log(`Total jobs retrieved from queue: ${jobs.length}`);

        // Loop through each job to find the matching bot_id and unique_id
        for (const job of jobs) {
            const jobData = job.data; // Accessing job data directly

            if (String(jobData.traderLogin) === String(traderLogin)) {
                console.log("🔔  ~ found bot_id @StopBot:", jobData.traderLogin);
                jobData.running = false;
                const temp = jobData;
                job.update(temp);
                //this.unsubscribeFromSpotQuotes(jobData.symbolIds)
                // Check if the job is in the 'active' state before attempting to move it
                const state = await job.getState();
                console.log("🚀 ~ BaseBotService ~ stopBot ~ state:", state);
                if (state === 'active') {
                    console.log("🚀 ~ Attempting to move job to completed...");
                    await job.moveToCompleted('jobCompleted . . .', true);
                    console.log("🚀 ~ Job moved to completed successfully.");
                } else {
                    console.error(`Job is not in an active state (current state: ${state}), cannot move to completed.`);
                    try {
                        const jobData = job.data;

                        // Validate job data
                        if (!jobData || !jobData.traderLogin) {
                            console.error(`Job data is missing or corrupted for job ID: ${job.id}`);
                            continue; // Skip this job
                        }

                        await job.remove();
                        console.log("🚀 ~ Job removed successfully.");
                        console.log("🛑 ~ BOT STOPPED");

                        // Update the running bot list
                        console.log(`📉 Updating running bot list. Removing TraderLogin: ${traderLogin}`);
                                console.log("🚀 Active bot list before Updation:", JSON.stringify(this.runningBotList, null, 2))
                                this.runningBotList = this.runningBotList.filter(
                                  bot => String(bot.login) !== String(traderLogin)
                                );
                                console.log("🚀 Updated active bot list:", JSON.stringify(this.runningBotList, null, 2));
                      
                                return {
                                  response: 'Success',
                                  message: `Bot with traderLogin: ${traderLogin} has been successfully stopped.`,
                                };
    
                    } catch (innerError) {
                        console.error(`Error processing job ID ${job.id}:`, innerError);
                    }
                }
            }
        }

        console.warn(`No active bot found with TraderLogin: ${traderLogin}.`);
        return {
            response: 'Failure',
            message: `No active bot found with TraderLogin: ${traderLogin}.`,
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

      if (activeIds_.Bot_id) {
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
    try {
      const jobs = await this.bot_queue.getJobs(['active', 'completed']);
      const active_Bots = []

      if (jobs.length > 0) {
        for (const job of jobs) {
          console.log("🔍 Processing Job ID:", job.id);
          //console.log("🚀 ActiveBotIds ~ job:", job)
          // Log job data for debugging purposes
          console.log("📦 Job Data:", JSON.stringify(job.data.traderLogin, job.data.status, 2));
          active_Bots.push(job.id)
          console.log("✅ Added Job ID to active_Bots:", job.id);

        }
        console.log("🚀 ~ ~ active_Bots:", active_Bots)
        return { response: `Active Ids`, Bot_id: ` ${active_Bots}` };

      }
      console.warn(" 🚀 ~ No active bot present")
      return { response: `No Active Bot present` };
    }
    catch (error) {
      console.log("🚀 ~ BaseBotService ~ ActiveBotIds ~ error:", error)
    }
  }
  async checkBotStatus(botInfo: Job) {
    try {
      // Extract and validate traderLogin
      const traderLogin = String(botInfo.data?.traderLogin || "").trim();
      if (!traderLogin) {
        console.error("❌ traderLogin is missing or invalid in the botInfo data.");
        return false;
      }
  
      console.log(`🔍 Checking status for traderLogin: ${traderLogin}`);
  
      // Fetch jobs from the bot queue in 'active' or 'completed' states
      const jobs_ = await this.bot_queue.getJobs(['active', 'completed']);
      console.log("📋 Total jobs fetched from queue:", jobs_.length);
  
      if (jobs_ && jobs_.length > 0) {
        for (const job of jobs_) {
          console.log(`🔍 Inspecting Job ID: ${job.id}`);
  
          // Safely retrieve and compare traderLogin from job data
          const jobTraderLogin = String(job.data?.traderLogin || "").trim();
          console.log(
            `📦 Job Data: TraderLogin: ${jobTraderLogin}, Status: ${job.data?.status}`
          );
  
          if (jobTraderLogin === traderLogin) {
            console.log(
              `✅ Bot is active for traderLogin: ${traderLogin}, Job ID: ${job.id}`
            );
            return true;
          }
        }
      }
  
      // If no matching job is found
      console.warn(`⚠️ No active or completed bot found for traderLogin: ${traderLogin}`);
      return false;
    } catch (error) {
      console.error("🚀 ~ BaseBotService ~ checkBotStatus ~ error:", error);
      return false;
    }
  }
  

}