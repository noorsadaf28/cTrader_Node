// import { IEvaluationInterface } from "./Interfaces/IEvaluation.interface";

// export abstract class BaseEvaluationService implements IEvaluationInterface{

// }
import { IEvaluationInterface } from "./Interfaces/IEvaluation.interface";
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import * as net from 'net';
import * as protobuf from 'protobufjs';
import { RulesRequest } from "src/models/rulesModel";
import * as tls from 'tls';
import { BaseAccountService } from "./baseAccount.service";
import { AccountConfig, PhaseSettings } from "src/data/rulesData";
import axios from "axios";
import { IAccountInterface } from 'src/services/Interfaces/IAccount.interface';
import { Job } from "bull";
import { HttpService } from "@nestjs/axios";
import * as dayjs from 'dayjs';
import { json } from "stream/consumers";
import { TradingPhases } from '../data/rulesData';
// import { 
//   ProtoSubscribeSpotQuotesReq, 
//   ProtoSubscribeSpotQuotesRes, 
//   ProtoUnsubscribeSpotQuotesReq, 
//   ProtoUnsubscribeSpotQuotesRes,
//   ProtoSpotEvent 
// } from 'protobufs/CSMessages_External.proto';
//import { ProtoSubscribeSpotQuotesReq, ProtoUnsubscribeSpotQuotesRes, ProtoSpotEvent } from './protobufs/CSMessages_External.proto';

export abstract class BaseEvaluationService implements IEvaluationInterface, OnModuleInit {
  private client: tls.TLSSocket;
  private root: protobuf.Root;
  private root2: protobuf.Root;
  private messageBuffer: Buffer = Buffer.alloc(0);
  private subscriptions: Set<number> = new Set(); // Store active subscriptions
  private botInfo: Job;
  private readonly xanoEquityUrl: string;
  private readonly spotwareApiUrl: string;
  private readonly apiToken: string;
  private readonly MakeUrl:string;
  constructor(@Inject('IAccountInterface') private readonly IAccountInterface: IAccountInterface) {
    this.xanoEquityUrl = process.env.XANO_API_EQUITYURL;
    this.spotwareApiUrl = process.env.SPOTWARE_API_URL;
    this.apiToken = process.env.SPOTWARE_API_TOKEN;
     this.MakeUrl = process.env.MAKEENDPOINT_URL;
  }

  async onModuleInit() {
    await this.initializeConnection();
  }

  private async initializeConnection() {
    try {
      // Load Protobuf definitions
      this.root = await protobuf.load('protobufs/CSMessages_External.proto');
      this.root2 = await protobuf.load('protobufs/CommonMessages_External.proto');
      const proxyHost = process.env.host;
      const proxyPort = parseInt(process.env.port);

      // Establish a secure connection to the server
      const client = new net.Socket();
      this.client = tls.connect({
        host: "uat-demo.p.ctrader.com",
        port: 5011,
        rejectUnauthorized: false,
      });
      // Enable keep-alive to prevent idle timeout
      this.client.on('connect', () => {
        console.log('SSL connection established');
        //this.createHeartbeatMessage()
        this.authManager()
        this.sendHeartbeat()
        //this.subscribeToSpotQuotes()
      });
      this.client.setKeepAlive(true, 10000);
      this.client.on('data', (data: Buffer) => {
        this.handleEventData(data);
      });
      this.client.on('end', () => {
        console.log('Connection ended by server');
        //this.reconnect();
      });

      // Listen for 'close' event, which happens when the connection fully closes
      this.client.on('close', (hadError) => {
        console.log(`Connection closed${hadError ? ' due to an error' : ''}`);
        console.log('Socket destroyed:', this.client.destroyed); // Will be true after the socket is fully closed
      });
      this.client.on('error', (err) => {
        console.error('Connection error:', err.message);
      });
    } catch (error) {
      console.error('Error initializing connection:', error);
    }
  }
  async subscribeToSpotQuotes(botInfo: Job) {
    try {
      if (!this.root) throw new Error('Protobuf root not loaded');
      this.botInfo = botInfo;
      // Find unsubscribed symbols
      const unsubscribedSymbols = botInfo.data.symbols.filter(
        (symbol) => !botInfo.data.symbolsSubscribed.includes(symbol)
      );

      if (unsubscribedSymbols.length === 0) {
        console.log("All symbols are already subscribed.");
        return { message: "All symbols are already subscribed" };
      }

      // Get symbol IDs for unsubscribed symbols
      const symbolIds = await this.symbolList(unsubscribedSymbols);

      // Lookup and create a SubscribeSpotQuotesReq message
      const SubscribeSpotQuotesReq = this.root.lookupType('ProtoSubscribeSpotQuotesReq');
      const ProtoPayloadType = this.root.lookupEnum("ProtoCSPayloadType");
      const ProtoMessage = this.root2.lookupType("ProtoMessage");

      const authPayload = SubscribeSpotQuotesReq.create({
        symbolId: symbolIds,
        subscribeToSpotTimestamp: true
      });
      const payloadBuffer = SubscribeSpotQuotesReq.encode(authPayload).finish();

      // Create a ProtoMessage wrapping the subscription request
      const message = ProtoMessage.create({
        payloadType: ProtoPayloadType.values.PROTO_SUBSCRIBE_SPOT_QUOTES_REQ,
        payload: payloadBuffer,
      });

      const messageBuffer = Buffer.from(ProtoMessage.encode(message).finish());
      const fullMessage = this.prefixMessageWithLength(messageBuffer);

      // Send subscription request
      const writeResult = this.client.write(fullMessage);
      console.log("Sent subscription request:", writeResult);

      if (writeResult) {
        // Update symbolsSubscribed with the new subscribed symbols
        botInfo.data.symbolsSubscribed.push(...unsubscribedSymbols);
        this.botInfo = botInfo
      }
      // console.log("🚀 ~ BaseEvaluationService ~ subscribeToSpotQuotes ~ symbolsSubscribed -------------  1:", botInfo.data)
      // console.log("🚀 ~ BaseEvaluationService ~ subscribeToSpotQuotes ~ symbolsSubscribed-------------- 2:", this.botInfo.data)

      // Await server response
      return await new Promise((resolve, reject) => {
        this.client.once('data', (data: Buffer) => {
          try {
            const responseLength = data.readUInt32BE(0);
            const responseBuffer = data.slice(4, 4 + responseLength);

            // Decode the response
            const SubscribeSpotQuotesRes = this.root.lookupType('ProtoSubscribeSpotQuotesRes');
            const err = SubscribeSpotQuotesRes.verify(responseBuffer);
            if (err) throw err;

            const responseMessage = SubscribeSpotQuotesRes.decode(responseBuffer);
            console.log("Subscription confirmed:", responseMessage);

            if (responseMessage) {
              resolve({ message: "Subscription successful" });
            } else {
              reject(new Error('Unexpected response type'));
            }
          } catch (error) {
            console.error("Decoding error:", error.message);
            reject(new Error("Error decoding server response: " + error.message));
          }
        });

        setTimeout(() => {
          reject(new Error('Subscription request timed out'));
        }, 5000);
      });
    } catch (error) {
      console.error('Subscription request failed:', error.message);
      return { message: "Subscription request failed", error: error.message };
    }
  }

  async unsubscribeFromSpotQuotes(subscriptionId: string) {
    try {
      const UnsubscribeSpotQuotesReq = this.root.lookupType('ProtoUnsubscribeSpotQuotesReq');
      const message = UnsubscribeSpotQuotesReq.create({ subscriptionId });

      // Serialize the message and convert Uint8Array to Buffer
      const messageBuffer = Buffer.from(UnsubscribeSpotQuotesReq.encode(message).finish());

      // Prefix the message with its length for the server
      const fullMessage = this.prefixMessageWithLength(messageBuffer);

      // Send the message over the socket
      this.client.write(fullMessage);
      console.log(`Unsubscribed from subscription ID: ${subscriptionId}`);
      return { message: "Unsubscription request sent" };
    } catch (error) {
      console.error('Error unsubscribing from spot quotes:', error);
    }
  }
  // Helper to add message length prefix for server communication
  private prefixMessageWithLength(buffer: Buffer): Buffer {
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(buffer.length, 0);
    return Buffer.concat([lengthBuffer, buffer]);
  }
  // Handle incoming data, process ProtoSpotEvent messages
  private handleEventData(data: Buffer) {
    //console.log("Data received in handleEventData", data.toString());

    // Append new data to the existing buffer
    this.messageBuffer = Buffer.concat([this.messageBuffer, data]);

    while (true) {
      // Check if we have enough data for the message length prefix
      if (this.messageBuffer.length < 4) {
        //console.log("Insufficient data for length prefix, waiting for more data.");
        return;
      }

      // Read the length prefix
      const length = this.messageBuffer.readUInt32BE(0);
      //console.log("Message length prefix:", length);

      // Verify if we have the full message based on the length prefix
      if (this.messageBuffer.length < 4 + length) {
        console.log("Incomplete message received, waiting for full data...");
        return;
      }

      // Extract the complete message from the buffer
      const eventDataBuffer = this.messageBuffer.slice(4, 4 + length);

      // Update the buffer to remove the processed message
      this.messageBuffer = this.messageBuffer.slice(4 + length);

      const ProtoSpotEvent = this.root.lookupType('ProtoSpotEvent');

      try {
        // Decode the complete ProtoSpotEvent message
        const decodedEvent = ProtoSpotEvent.decode(eventDataBuffer);
        const protoJson = decodedEvent.toJSON();
        if(protoJson.payloadType == 'PROTO_SPOT_EVENT'){
          console.log("Tick Recieved:", protoJson);
          this.checkRules(protoJson.symbolId);
        }
        // Process the decoded spot data
        //this.processSpotData(decodedEvent);
      } catch (error) {
        console.error("Error decoding ProtoSpotEvent:", error.message);
      }
    }
  }
  async authManager() {
    try {
      if (!this.root) throw new Error('Protobuf root not loaded');

      // Lookup and create a ProtoManagerAuthReq message
      const ManagerAuthReq = this.root.lookupType('ProtoManagerAuthReq');
      const ProtoPayloadType = this.root.lookupEnum("ProtoCSPayloadType");
      const ProtoMessage = this.root2.lookupType("ProtoMessage");

      const authPayload = ManagerAuthReq.create({
        plantId: "propsandbox",
        environmentName: "demo",
        login: 30017,
        passwordHash: "68bf947cb75f1d31eea2e83afd062a06"

      });
      const payloadBuffer = ManagerAuthReq.encode(authPayload).finish();

      // Create a ProtoMessage wrapping the heartbeat
      const message = ProtoMessage.create({
        payloadType: ProtoPayloadType.values.PROTO_MANAGER_AUTH_REQ,
        payload: payloadBuffer,
      });
      // const message = ManagerAuthReq.create({
      //   payloadType: 301,
      //   plantId: "propsandbox",
      //   environmentName: "demo",
      //   login: 30017,
      //   passwordHash: "68bf947cb75f1d31eea2e83afd062a06"
      // });
      //console.log("🚀 ~ BaseEvaluationService ~ authManager ~ message:", message)

      const messageBuffer = Buffer.from(ProtoMessage.encode(message).finish());
      const fullMessage = this.prefixMessageWithLength(messageBuffer);

      const writeResult = this.client.write(fullMessage);
      console.log("Sent authorization request:", writeResult);

      return await new Promise((resolve, reject) => {
        this.client.once('data', (data: Buffer) => {
          try {
            const responseLength = data.readUInt32BE(0);
            const responseBuffer = data.slice(4, 4 + responseLength);

            const ManagerAuthRes = this.root.lookupType('ProtoManagerAuthRes');
            const err = ManagerAuthRes.verify(responseBuffer);
            if (err) throw new Error(err);

            const authResponse = ManagerAuthRes.decode(responseBuffer);
            //console.log("Authorization response:", authResponse);

            if (authResponse) {
              resolve({ message: "Authorization successful", permissions: authResponse });
            } else {
              reject(new Error("Unexpected response type or missing permissions"));
            }
          } catch (error) {
            console.error("Decoding error:", error.message);
            reject(new Error("Error decoding authorization response: " + error.message));
          }
        });

        setTimeout(() => {
          reject(new Error('Authorization request timed out'));
        }, 5000);
      });
    } catch (error) {
      console.error('Authorization request failed:', error.message);
      return { message: "Authorization request failed", error: error.message };
    }
  }
  async createHeartbeatMessage() {
    // Load compiled Protobuf schema
    // const root = await protobuf.load("path/to/compiled.json");

    // Get message types from schema
    const ProtoHeartbeatEvent = this.root2.lookupType("ProtoHeartbeatEvent");
    const ProtoMessage = this.root2.lookupType("ProtoMessage");
    const ProtoPayloadType = this.root.lookupEnum("ProtoPayloadType");
    //console.log("🚀 ~ BaseEvaluationService ~ createHeartbeatMessage ~ ProtoPayloadType:", ProtoPayloadType)

    // Create a ProtoHeartbeatEvent payload
    const heartbeatPayload = ProtoHeartbeatEvent.create({});
    const payloadBuffer = ProtoHeartbeatEvent.encode(heartbeatPayload).finish();

    // Create a ProtoMessage wrapping the heartbeat
    const message = ProtoMessage.create({
      payloadType: ProtoPayloadType.values.PROTO_HEARTBEAT_EVENT,
      payload: payloadBuffer
    });
    console.log("🚀 ~ BaseEvaluationService ~ createHeartbeatMessage ~ message:", message)

    // Encode the final message
    const messageBuffer = ProtoMessage.encode(message).finish();
    console.log("Serialized ProtoMessage:", messageBuffer);
    // const writeResult = this.client.write(messageBuffer);
    // console.log("Sent authorization request:", writeResult);
    return messageBuffer;
  }
  private sendHeartbeat() {
    setInterval(() => {
      const ProtoHeartbeatEvent = this.root2.lookupType("ProtoHeartbeatEvent");
      const ProtoMessage = this.root2.lookupType("ProtoMessage");
      const ProtoPayloadType = this.root.lookupEnum("ProtoPayloadType");

      const heartbeatPayload = ProtoHeartbeatEvent.create();
      const payloadBuffer = ProtoHeartbeatEvent.encode(heartbeatPayload).finish();

      const message = ProtoMessage.create({
        payloadType: ProtoPayloadType.values.HEARTBEAT_EVENT,
        payload: payloadBuffer,
      });

      const messageBuffer = Buffer.from(ProtoMessage.encode(message).finish());
      const fullMessage = this.prefixMessageWithLength(messageBuffer);

      this.client.write(fullMessage);
      console.log('Sent heartbeat message');
    }, 30000); // Send heartbeat every 30 seconds
  }

  async rulesEvaluation(botInfo: Job) {
    try {
      const accountdata = await this.IAccountInterface.AccountDetails(botInfo.data);
      let ruledata = new RulesRequest;
      const url = process.env.makeEvalURL;
      const phaseSettings = PhaseSettings[botInfo.data.Phase];
      console.log("🚀 ~ BaseEvaluationService ~ rulesEvaluation ~ phaseSettings:", phaseSettings)
      ruledata.account = accountdata.login;
      ruledata.balance = accountdata.balance.toString();
      ruledata.request_type = botInfo.data.request_type;
      ruledata.metatrader = AccountConfig.METATRADER_PLATFORM,
      ruledata.status = botInfo.data.status;
      ruledata.initial_balance = accountdata.balance.toString();
      ruledata.max_daily_loss = phaseSettings.max_daily_loss;
      ruledata.max_loss = phaseSettings.max_loss;
      ruledata.profit_target = phaseSettings.profit_target,
      ruledata.minimum_trading_days = phaseSettings.minimum_trading_days,
      ruledata.max_trading_days = phaseSettings.max_trading_days,
      ruledata.max_daily_currency = botInfo.data.max_daily_currency.toString(),
      ruledata.max_total_currency = botInfo.data.max_total_currency.toString(),
      ruledata.starting_daily_equity = phaseSettings.starting_daily_equity,
      ruledata.phase = botInfo.data.Phase;
      ruledata.challenge_won = botInfo.data.challenge_won;
      ruledata.challenge_ends = botInfo.data.challenge_ends;
      ruledata.daily_kod = botInfo.data.daily_kod;
      console.log("🚀 ~ BaseEvaluationService ~ rulesEvaluation ~ ruledata:", ruledata)
      const response = await axios.post(url, ruledata);
      console.log("🚀 ~ BaseEvaluationService ~ rulesEvaluation ~ response:", response.data);
      return response.data;

    }
    catch (error) {
      console.log("🚀 ~ BaseEvaluationService ~ rulesEvaluation ~ error:", error)

    }
  }
  async symbolList(symbols) {
    let symbolID = [];
    try {
      const symbolURL = process.env.symbolURL;
      const response = await axios.get(`${symbolURL}${process.env.token}`);
      response.data.symbol.forEach(totalsymbol => {
        symbols.forEach(symbolList => {
          if (totalsymbol.name == symbolList) {
            symbolID.push(totalsymbol.id);
          }
        });

      });
      console.log("🚀 ~ BaseEvaluationService ~ symbolList ~ symbolID:", symbolID)
      return symbolID;
    }
    catch (error) {
      console.log("🚀 ~ BaseEvaluationService ~ symbolList ~ error:", error.response.data)

    }
  }
  async symbolname(symbolID) {
    try {
      let symbolName;
      const symbolURL = process.env.symbolURL;
      const response = await axios.get(`${symbolURL}${process.env.token}`);
      response.data.symbol.forEach(totalsymbol => {
        if (totalsymbol.id == symbolID) {
          symbolName = totalsymbol.name;
        }
      });

      return symbolName;
    }
    catch (error) {
      console.log("🚀 ~ BaseEvaluationService ~ symbolList ~ error:", error.response.data)

    }
  }
  async checkRules(symbolId: string) {
     
      try {
          console.debug("checkRules started for symbolId:", symbolId);
  
          const symbolName = await this.symbolname(symbolId);
          console.debug("Fetched symbolName:", symbolName);
  
          if (this.botInfo.data.symbolsSubscribed.includes(symbolName)) {
              console.log("✅ Symbol present for user.");
  
              // Fetch relevant data
              const currentEquity = await this.getCurrentEquity(this.botInfo.data.accountId);
              console.debug("Current equity fetched:", currentEquity);
  
              const startingDailyEquity = await this.getDailyEquity(this.botInfo.data.accountId);
              console.debug("Starting daily equity fetched:", startingDailyEquity);
  
              const maxDailyCurrency = parseInt(this.botInfo.data.max_daily_currency);
              console.debug("Max daily currency:", maxDailyCurrency);
  
              const maxTotalCurrency = parseInt(this.botInfo.data.max_total_currency);
              console.debug("Max total currency:", maxTotalCurrency);
  
              const initial_balance = parseInt(this.botInfo.data.initial_balance);
              console.debug("Initial balance fetched:", initial_balance);
  
              // Debug log to check the botInfo data
              // console.log("Bot Info Data:", JSON.stringify(this.botInfo.data, null, 2));
  
              // Ensure profit_target is available
              const profitTarget = parseFloat(this.botInfo.data.profit_target);
              if (isNaN(profitTarget)) {
                  console.error("🚨 Invalid profit_target:", this.botInfo.data.profit_target);
                  throw new Error("Invalid profit_target");
              }
              console.debug("Profit target validated:", profitTarget);
  
              const dataJson = {
                  currentEquity,
                  startingDailyEquity,
                  maxDailyCurrency,
                  maxTotalCurrency,
                  initial_balance,
              };
              console.debug("Constructed dataJson:", JSON.stringify(dataJson, null, 2));
  
              // Call KOD functions with correct arguments
              const checkDailyKOD = await this.dailyKOD(dataJson);
              console.debug("Daily KOD check result:", checkDailyKOD);
  
              const checkTotalKOD = await this.TotalKOD(dataJson);
              console.debug("Total KOD check result:", checkTotalKOD);
  
              const checkConsistencyKOD = await this.ConsistencyKOD(this.botInfo);
              console.debug("Consistency KOD check result:", checkConsistencyKOD);
  
              // Handle KOD checks
              if (checkDailyKOD) {
                  console.warn("❌ User failed Daily KOD:", checkDailyKOD);
                  
                  await this.sendDailyKOD(this.botInfo);


                  
              } else if (checkTotalKOD) {
                  console.warn("❌ User failed Total KOD:", checkTotalKOD);
                  await this.stopChallenge(this.botInfo);
              } else if (checkConsistencyKOD) {
                  console.warn("❌ User failed Consistency KOD:", checkConsistencyKOD);
                  await this.stopChallenge(this.botInfo);
              } else {
                  console.log("✅ All KOD checks passed.");
              }
          } else {
              console.log("❌ Symbol not subscribed for this user.");
          }
      } catch (error) {
          console.error("🚀 ~ checkRules ~ error:", error);
      }
  }
  


  async dailyKOD(req) {
    try {
      const result = req.currentEquity - (req.startingDailyEquity - req.maxDailyCurrency) < 0;
      console.log("🚀 ~ BaseEvaluationService ~ dailyKOD ~ result:", result)
      return result;
    }
    catch (error) {
      console.log("🚀 ~ BaseEvaluationService ~ dailyKOD ~ error:", error)

    }
  }
  async TotalKOD(req) {
    try {
      const result = req.currentEquity - (req.initial_balance - req.maxTotalCurrency) < 0;
      console.log("🚀 ~ BaseEvaluationService ~ TotalKOD ~ result:", result)
      return result;
    }
    catch (error) {
      console.log("🚀 ~ BaseEvaluationService ~ dailyKOD ~ error:", error)

    }
  }


async ConsistencyKOD(botInfo: Job): Promise<boolean> {
  // console.debug(`ConsistencyKOD started for botInfo: ${JSON.stringify(botInfo)}`);

    const login = botInfo.data.traderLogin;
    const currentPhase = botInfo.data.Phase; // Assume this is stored in botInfo
    console.info(`Processing ConsistencyKOD for login: ${login}, phase: ${currentPhase}`);
    try {
      // Step 1: Fetch the profit target dynamically for each bot/account
      const phaseSettings = PhaseSettings[currentPhase];
      if (!phaseSettings) {
        console.error(`Invalid trading phase: ${currentPhase}`);
        throw new Error(`Invalid trading phase: ${currentPhase}`);
      }
  
      const phaseProfitTarget = parseFloat(phaseSettings.profit_target);
      const maxAllowedProfit = phaseProfitTarget * 0.25; // 25% of the profit target
      const maxAllowedProfitTarget = (maxAllowedProfit*botInfo.data.initial_balance)*100;
  
      console.info(`Account ${login} - Phase: ${currentPhase}, Profit Target: ${phaseProfitTarget}, Max Allowed Profit: ${maxAllowedProfit}`);
  
      // Fetch closed positions
      const now = new Date();
      const to = now.toISOString();
      const from = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  
      console.debug(`Fetching closed positions from ${from} to ${to}`);
  
      const response = await axios.get(`${this.spotwareApiUrl}/v2/webserv/closedPositions`, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
        params: { from, to, token: this.apiToken, login },
      });
  
      if (response.status !== 200 || !response.data) {
        console.error(`Failed to fetch closed positions for account ${login}. Status: ${response.status}`);
        throw new Error(`Failed to fetch closed positions for account ${login}.`);
      }
  
      console.debug(`Closed positions response: ${JSON.stringify(response.data)}`);
  
         // Parse and evaluate the response
    const closedPositions = response.data
    .trim()
    .split("\n")
    .slice(1) // Skip headers
    .map((line) => {
      const [
        ,
        positionId,
        ,
        ,
        ,
        ,
        ,
        ,
        ,
        ,
        pnl,
      ] = line.split(",");

      return {
        positionId,
        pnl: parseFloat(pnl),
      };
    });

  console.debug(`Parsed closed positions: ${JSON.stringify(closedPositions)}`);

  // Check for violations
  const isConsistencyViolated = closedPositions.some((trade) => {
    
    console.info(`Account ${login} - Analyzing trade ${trade.positionId} with PnL: ${trade.pnl}, Max Allowed: ${maxAllowedProfit}`);
    return trade.pnl > maxAllowedProfitTarget;
    // const dataJson = {
    //   accounts: [{
    //     id: login,
    //     status: process.env.failed,
    //   }],
    //   // Additional fields for Make endpoint
    //   Account: login.toString(), // Convert to string as it was hardcoded in the example
    //   Platform: "CTrader",
    //   ChallengeID:"1292" // Use the ChallengeID from the request if available, otherwise use a default
    // };const response1 =  axios.patch(this.MakeUrl, dataJson);
  });

  if (isConsistencyViolated) {
    console.warn(`❌ Consistency KOD violated for account ${login}`);
  } else {
    console.info(`✅ Consistency KOD passed for account ${login}`);
  }

  console.debug(`ConsistencyKOD finished. Result: ${isConsistencyViolated}`);
  return isConsistencyViolated;
} catch (error) {
  console.error(`🚀 ~ ConsistencyKOD ~ error for account ${login}:`, error);
  return false; // Return false on error for safety
}
}
  async getTradingDays() {
    try {
      const prevDataResponse = await axios.get(`${process.env.xanoEquityUrl}?account=${this.botInfo.data.accountId}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      // const prevDataResponse = await this.httpService
      // .get(`${process.env.xanoEquityUrl}?account=${this.botInfo.data.accountId}`, {
      //   headers: { 'Content-Type': 'application/json' },
      // });
      console.log("🚀 ~ BaseEvaluationService ~ getTradingDays ~ prevDataResponse:", prevDataResponse)
    }
    catch (error) {
      console.log("🚀 ~ BaseEvaluationService ~ getTradingDays ~ error:", error)
    }
  }
  async getCurrentEquity(accountId) {
    try {
      const reqjson = {
        accountId
      }
      const accountData = await this.IAccountInterface.AccountDetails(reqjson);
      if (accountData.balance) {
        console.log("🚀 ~ BaseEvaluationService ~ getCurrentEquity ~ balance:", accountData.balance);
        return accountData.balance
      }
    }
    catch (error) {
      console.log("🚀 ~ BaseEvaluationService ~ getCurrentEquity ~ error:", error)
    }
  }
  async getDailyEquity(accountId) {
    try {
      // const reqjson = {
      //   accountId
      // }
      const date = dayjs(Date.now()).format('YYYY-MM-DD');
      console.log("🚀 ~ BaseEvaluationService ~ getDailyEquity ~ prevDate:", date)
      const prevDataResponse = await axios.get(`${this.xanoEquityUrl}/${accountId}/`)
      console.log("🚀 ~ BaseEvaluationService ~ getDailyEquity ~ prevDataResponse:", prevDataResponse.data.starting_daily_equity)
      return prevDataResponse.data.starting_daily_equity;
      // const accountData = await this.IAccountInterface.AccountDetails(reqjson);
      // if(accountData.balance){
      //   console.log("🚀 ~ BaseEvaluationService ~ getCurrentEquity ~ balance:", accountData.balance);
      //   return accountData.balance
      // }
    }
    catch (error) {
      console.log("🚀 ~ BaseEvaluationService ~ getCurrentEquity ~ error:", error)
    }
  }
  async sendDailyKOD(botInfo:Job){
    try{
      botInfo.data.request_type = "DailyKOD";
      botInfo.data.status = "Failed";
      botInfo.data.challenge_won = "false";
      botInfo.data.challenge_ends = dayjs(Date.now()).format('YYYY-MM-DD');
      botInfo.data.daily_kod = "true",
      await this.rulesEvaluation(botInfo);
    }
    catch(error){
      console.log("🚀 ~ BaseEvaluationService ~ sendDailyKOD ~ error:", error)
    }
  }
  async stopChallenge(botInfo:Job){
    try{

    }
    catch(error) {
    console.log("🚀 ~ BaseEvaluationService ~ stopChallenge ~ error:", error)
    }
  }
}
