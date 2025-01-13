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
import { IBotInterface } from "./Interfaces/IBot.interface";
import { IOrderInterface } from "./Interfaces/IOrder.interface";
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
  private readonly MakeUrl: string;
  constructor(@Inject('IAccountInterface') private readonly IAccountInterface: IAccountInterface,
    @Inject('IBotInterface') private readonly IBotInterface: IBotInterface) {
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
        this.handleEventData(data, this.botInfo);
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

      // Find unsubscribed symbols
      console.log("🚀 ~ BaseEvaluationService ~ subscribeToSpotQuotes ~ botInfo.data.symbolsSubscribed:", botInfo.data.traderLogin, botInfo.data.symbols, botInfo.data.symbolsSubscribed)
      const unsubscribedSymbols = botInfo.data.symbols.filter(
        (symbol) => !botInfo.data.symbolsSubscribed.includes(symbol)
      );

      // if (unsubscribedSymbols.length === 0) {
      //   console.log(`All symbols are already subscribed for bot ${botInfo.data.traderLogin}.`);
      //   return { message: "All symbols are already subscribed", botId: botInfo.data.traderLogin };
      // }

      // Get symbol IDs for unsubscribed symbols
      const symbolIds = await this.symbolList(unsubscribedSymbols);
      // Log the unsubscribed symbols for the bot
      console.log(`Unsubscribed symbols for bot ${botInfo.data.traderLogin}:`, unsubscribedSymbols);

      // Lookup and create a SubscribeSpotQuotesReq message
      const SubscribeSpotQuotesReq = this.root.lookupType('ProtoSubscribeSpotQuotesReq');
      const ProtoPayloadType = this.root.lookupEnum("ProtoCSPayloadType");
      const ProtoMessage = this.root2.lookupType("ProtoMessage");

      const authPayload = SubscribeSpotQuotesReq.create({
        bot: botInfo.data.traderLogin,
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

              // Update symbolsSubscribed with the new subscribed symbols
              botInfo.data.symbolsSubscribed.push(...unsubscribedSymbols);
              this.botInfo = botInfo;
              resolve({ message: "Subscription successful" });
            } else {
              reject(new Error('Unexpected response type'));
            }
          } catch (error) {
            console.error("Decoding error:", error.message);
            reject(new Error("Error decoding server response: " + error.message));
          }
        });

        // setTimeout(() => {
        //   reject(new Error('Subscription request timed out'));
        // }, 5000);
      });
    } catch (error) {
      console.error('Subscription request failed:', error.message);
      return { message: "Subscription request failed", error: error.message };
    }
  }

  async unsubscribeFromSpotQuotes(symbols) {
    try {
      const symbolIds = await this.symbolList(symbols);
      const UnsubscribeSpotQuotesReq = this.root.lookupType('ProtoUnsubscribeSpotQuotesReq');
      const ProtoPayloadType = this.root.lookupEnum("ProtoCSPayloadType");
      const ProtoMessage = this.root2.lookupType("ProtoMessage");
      const authPayload = UnsubscribeSpotQuotesReq.create({
        symbolId: symbolIds,
      });
      const payloadBuffer = UnsubscribeSpotQuotesReq.encode(authPayload).finish();


      // Create a ProtoMessage wrapping the subscription request
      const message = ProtoMessage.create({
        payloadType: ProtoPayloadType.values.PROTO_UNSUBSCRIBE_SPOT_QUOTES_REQ,
        payload: payloadBuffer,
      });

      const messageBuffer = Buffer.from(ProtoMessage.encode(message).finish());
      const fullMessage = this.prefixMessageWithLength(messageBuffer);

      // Send subscription request
      const writeResult = this.client.write(fullMessage);
      console.log("Unsubscribed from symbol IDs:", symbolIds);
      // Serialize the message and convert Uint8Array to Buffer
      // const messageBuffer = Buffer.from(UnsubscribeSpotQuotesReq.encode(message).finish());

      // // Prefix the message with its length for the server
      // const fullMessage = this.prefixMessageWithLength(messageBuffer);

      // // Send the message over the socket
      // this.client.write(fullMessage);
      // console.log(`Unsubscribed from subscription ID: ${subscriptionId}`);
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
  private async handleEventData(data: Buffer, botInfo: Job) {
    // Append new data to the existing buffer
    this.messageBuffer = Buffer.concat([this.messageBuffer, data]);

    while (true) {
      // Check if we have enough data for the message length prefix
      if (this.messageBuffer.length < 4) {
        return; // Not enough data, wait for more
      }

      // Read the length prefix
      const length = this.messageBuffer.readUInt32BE(0);

      // Verify if we have the full message based on the length prefix
      if (this.messageBuffer.length < 4 + length) {
        console.log("Incomplete message received, waiting for full data...");
        return;
      }

      // Extract the complete message from the buffer
      const eventDataBuffer = this.messageBuffer.slice(4, 4 + length);

      // Update the buffer to remove the processed message
      this.messageBuffer = this.messageBuffer.slice(4 + length);

      const ProtoSpotEvent = this.root.lookupType("ProtoSpotEvent");

      try {
        // Decode the complete ProtoSpotEvent message
        const decodedEvent = ProtoSpotEvent.decode(eventDataBuffer);
        const protoJson = decodedEvent.toJSON();

        if (protoJson.payloadType === "PROTO_SPOT_EVENT") {
          console.log("Tick Received:", protoJson);

          // Fetch the symbol name using the symbolname function
          const symbolName = await this.symbolname(protoJson.symbolId);

          console.log(
            "🚀 ~ handleEventData ~ botInfo.data.symbolsSubscribed:",
            botInfo.data.symbolsSubscribed,
            protoJson.symbolId,
            symbolName,
            protoJson
          );

          // Match the symbolName to subscribed symbols
          if (symbolName && botInfo.data.symbolsSubscribed.includes(symbolName)) {
            await this.checkRules(botInfo, protoJson.symbolId, protoJson); // Pass tick data
          } else {
            console.warn("❌ Symbol not subscribed for this bot.");
          }
        }
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
      const phaseSettings = PhaseSettings[botInfo.data.Challenge_type]?.[botInfo.data.Phase];
      console.log("🚀 ~ BaseEvaluationService ~ rulesEvaluation ~ phaseSettings:", phaseSettings)
      ruledata.account = accountdata.login;
      ruledata.balance = botInfo.data.Initial_balance;
      ruledata.request_type = botInfo.data.request_type;
      ruledata.metatrader = AccountConfig.METATRADER_PLATFORM,
        ruledata.bot_version = botInfo.data.Bot_version;
      ruledata.status = botInfo.data.status;
      ruledata.initial_balance = botInfo.data.Initial_balance;

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
      ruledata.total_kod = botInfo.data.total_kod;
      ruledata.challenge_begins = botInfo.data.challenge_begins;
      ruledata.consistency_kod = botInfo.data.consistency_kod;
      ruledata.consistency_value = botInfo.data.consistency_value;
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
  async checkRules(botInfo: Job, symbolId: string, tick: any) {
    try {
      const isBotActive = await this.IBotInterface.checkBotStatus(botInfo);
      console.log(
        "🚀 ~ Bot status in checkRules for",
        botInfo.data.traderLogin,
        "is",
        isBotActive ? "ACTIVE" : "INACTIVE"
      );

      if (!isBotActive) {
        await this.unsubscribeFromSpotQuotes(botInfo.data.symbolsSubscribed);
        console.log("⛔️ Evaluation Stopped - Bot Not Active");
        return { response: "❌ Bot Not Present..." };
      }

      const symbolName = await this.symbolname(symbolId);
      console.debug("Fetched symbolName:", symbolName);

      if (symbolName && botInfo.data.symbolsSubscribed.includes(symbolName)) {
        console.log("✅ Symbol present for user.");

        const currentEquityforDailyKOD = await this.calculateCurrentEquity(botInfo, tick);
        console.debug("Calculated Current Equity:", currentEquityforDailyKOD);

        const startingDailyEquity = await this.getDailyEquity(botInfo.data.traderLogin);
        console.debug("Starting daily equity fetched:", startingDailyEquity);

        const maxDailyCurrency = parseFloat(botInfo.data.max_daily_currency) || 0;
        console.debug("Max daily currency:", maxDailyCurrency);

        const equityLoss = startingDailyEquity - currentEquityforDailyKOD;
        console.debug(`Equity Loss: ${equityLoss}, Max Allowed: ${maxDailyCurrency}`);

        const initial_balance = parseInt(botInfo.data.Initial_balance);
        console.debug("Initial balance fetched:", initial_balance);


        let dataJson = {
          currentEquityforDailyKOD,
          startingDailyEquity,
          maxDailyCurrency,
          equityLoss,
          initial_balance,
          traderLogin: botInfo.data.traderLogin,
          status: botInfo.data.status
        };
        console.debug("Constructed dataJson:", JSON.stringify(dataJson, null, 2));
        // Call KOD functions with correct arguments
        const checkDailyKOD = await this.dailyKOD(dataJson);

        console.debug("Daily KOD check result:", checkDailyKOD, botInfo.data.traderLogin);
        console.log("The following results are here:")
        // Handle KOD checks
        if (checkDailyKOD) {
          console.warn("❌ User failed Daily KOD:", checkDailyKOD, botInfo.data.traderLogin);

          await this.sendDailyKOD(botInfo);
        } else {
          console.log("✅ All KOD checks passed.");
        }
      } else {
        console.log("❌ Symbol not subscribed for this user.");
      }
    }
    catch (error) {
      console.error("🚀 ~ checkRules ~ error:", error);
    }
  }

  private parseOpenPositionsCsv(csvData: string): any[] {
    const rows = csvData.split("\n").slice(1); // Skip header row
    return rows
      .filter((row) => row.trim())
      .map((row) => {
        const columns = row.split(",");

        // Parse and scale entry price and volume correctly
        const entryPrice = parseFloat(columns[3]);
        const volume = parseFloat(columns[5]);

        // Validate entry price and volume
        if (isNaN(entryPrice) || isNaN(volume)) {
          console.error(`❌ ~ Invalid entry price or volume in row:`, row);
        }

        return {
          login: columns[0],
          positionId: columns[1],
          openTimestamp: columns[2],
          entryPrice: entryPrice,
          direction: columns[4],
          volume: volume,
          symbol: columns[6],
          commission: parseFloat(columns[7] || "0"), // Default to 0 if missing
          swap: parseFloat(columns[8] || "0"), // Default to 0 if missing
          bookType: columns[9],
          stake: columns[10],
          spreadBetting: columns[11],
          usedMargin: parseFloat(columns[12] || "0"), // Default to 0 if missing
          stop_loss: "0",
        };
      });
  }
  async calculateCurrentEquity(botInfo: Job, tick: any): Promise<number> {
    try {
      const { bid, ask, symbolId } = tick;

      // Validate tick data
      if (!bid || !ask || !symbolId) {
        console.error("❌ ~ calculateCurrentEquity ~ Invalid tick data: Missing bid/ask/symbolId");
        throw new Error("Invalid tick data: Missing bid/ask/symbolId");
      }

      // Scale bid and ask prices
      const bidPrice = parseFloat(bid) / 100000;
      const askPrice = parseFloat(ask) / 100000;
      console.log(`🚀 ~ Bid Price: ${bidPrice}, Ask Price: ${askPrice}, Symbol ID: ${symbolId}`);

      const { starting_daily_equity, Initial_balance } = botInfo.data;
      const login = botInfo.data.traderLogin;
      console.log(`🚀 ~ Trader Login: ${login}, Initial Balance: ${Initial_balance}, Starting Daily Equity: ${starting_daily_equity}`);

      // Fetch the symbol name for the current tick
      const tickSymbolName = await this.symbolname(symbolId);
      console.log(`🚀 ~ Tick Symbol Name: ${tickSymbolName}`);

      if (!tickSymbolName) {
        console.error(`❌ ~ Unable to fetch symbol name for symbolId: ${symbolId}`);
        throw new Error(`Invalid symbolId: ${symbolId}`);
      }

      // Fetch open positions for this bot
      const response = await axios.get(`${this.spotwareApiUrl}/v2/webserv/openPositions`, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
        params: { token: this.apiToken, login },
      });
      const openPositions = this.parseOpenPositionsCsv(response.data);

      // Start with the initial balance or starting daily equity
      let currentEquity = parseFloat(starting_daily_equity) || parseFloat(Initial_balance) || 0;
      console.log(`🚀 ~ Initial Balance: ${currentEquity}`);

      // Loop through all open positions to calculate unrealized PnL
      for (const position of openPositions) {
        const { entryPrice, volume, direction, symbol, positionId } = position;
        console.log(`🚀 ~ Checking positionnnn:`, position);

        // Validate entryPrice and volume
        if (isNaN(entryPrice) || isNaN(volume)) {
          console.error(`❌ ~ Invalid entryPrice or volume for position:`, position);
          continue;
        }

        let unrealizedPnL = 0;

        // If the position's symbol matches the tick's symbol, calculate the PnL
        if (symbol === tickSymbolName) {
          if (direction === "BUY") {
            unrealizedPnL = (bidPrice - entryPrice) * volume;
          } else if (direction === "SELL") {
            unrealizedPnL = (entryPrice - askPrice) * volume;
          }

          console.log(
            `🚀 ~ Unrealized PnL for position [${positionId}]: ${unrealizedPnL}`
          );
        } else {
          // If no tick for the position's symbol, log the mismatch
          console.warn(
            `⚠️ Symbol mismatch for position ${positionId}: Tick (${tickSymbolName}) != Position (${symbol})`
          );
          continue; // Skip calculation for this position
        }

        // Update current equity with the unrealized PnL
        currentEquity += unrealizedPnL;

        console.log(
          `Updated Current Equity after position [${positionId}]:`,
          currentEquity
        );
      }

      console.debug("Final Calculated Current Equity:", currentEquity);
      return currentEquity;
    } catch (error) {
      console.error("❌ ~ calculateCurrentEquity ~ Error:", error);
      throw error;
    }
  }

  async checkAdditionalRules(botInfo: Job) {
    try {
      console.debug("checkAdditionalRules started for:", botInfo.data.traderLogin);
      const currentEquity = await this.getCurrentEquity(botInfo.data.traderLogin);
      console.debug("Current equity fetched:", currentEquity);
      const initial_balance = parseInt(botInfo.data.Initial_balance);
      const maxTotalCurrency = parseInt(botInfo.data.max_total_currency);
      const profitCurrency = parseInt(botInfo.data.profitCurrency);
      const profitTarget = parseFloat(botInfo.data.profit_target);

      if (isNaN(profitTarget)) {
        console.error("🚨 Invalid profit_target:", botInfo.data.profit_target);
        throw new Error("Invalid profit_target");
      }
      console.debug("Profit target validated:", profitTarget);

      const dataJson = {
        currentEquity,
        initial_balance,
        maxTotalCurrency,
        profitCurrency,
        traderLogin: botInfo.data.traderLogin,
        status: botInfo.data.status,
      };
      console.debug("Constructed dataJson for Total and Won KOD:", JSON.stringify(dataJson, null, 2));

      // Perform Total KOD check
      const checkTotalKOD = await this.TotalKOD(dataJson);
      console.debug("Total KOD check result:", checkTotalKOD, botInfo.data.traderLogin);

      if (checkTotalKOD) {
        console.warn("❌ User failed Total KOD:", checkTotalKOD, botInfo.data.traderLogin);
        await this.sendTotalKOD(botInfo);
      }

      // Perform Won Event check
      const checkWonEvent = await this.CheckWonKOD(dataJson);
      console.debug("Won check result:", checkWonEvent, botInfo.data.traderLogin);

      if (checkWonEvent) {
        console.warn("✅ User triggered a Won event.");
        await this.CheckWon(botInfo.data.traderLogin, botInfo);
      }
    } catch (error) {
      console.error("🚀 ~ checkAdditionalRules ~ error:", error);
    }
  }

  async dailyKOD(req) {
    try {
      console.log("Checking Bot Status Inside DailyKOD", req.traderLogin, req.status);

      if (req.status !== 'Active') {
        console.log("⚠️ Bot is not active. Skipping DailyKOD logic.", req.traderLogin);
        return false;
      }

      const resultValue = req.currentEquityforDailyKOD - (req.startingDailyEquity - req.maxDailyCurrency);
      const result = resultValue < 0;
      console.log(`🚀 ~ dailyKOD result for ${req.traderLogin}:`, result, "Calculated Value:", resultValue);

      return result;
    } catch (error) {
      console.error("🚨 Error in dailyKOD:", error);
      throw error;
    }
  }



  async TotalKOD(req) {
    try {
      console.log("Checking Bot Status Inside TotalKOD", req.traderLogin, req.status);

      if (req.status !== 'Active') {
        console.log("⚠️ Bot is not active. Skipping TotalKOD logic.");
        
        return false;
      }

      const resultValue = req.currentEquity - (req.initial_balance - req.maxTotalCurrency);
      const result = resultValue < 0;
      console.log(`🚀 ~ TotalKOD result for ${req.traderLogin}:`, result, "Calculated Value:", resultValue);

      return result;
    } catch (error) {
      console.error("🚨 Error in TotalKOD:", error);
      throw error;
    }
  }

  async CheckWonKOD(req) {
    try {
      console.log("Checking Bot Status Inside CheckWonKOD", req.traderLogin, req.status);

      if (req.status !== 'Active') {
        console.log("⚠️ Bot is not active. Skipping CheckWonKOD logic.");
        return false;
      }

      const resultValue = req.initial_balance + req.profitCurrency;
      const result = req.currentEquity >= resultValue;

      console.log(`🔍 ~ CheckWonKOD result for ${req.traderLogin}:`, result, "Required Value:", resultValue);

      return result;
    } catch (error) {
      console.error("🚨 Error in CheckWonKOD:", error);
      throw error;
    }
  }




  async CheckWon(login, botInfo: Job) {
    try {
      const response = await axios.get(`${this.spotwareApiUrl}/v2/webserv/openPositions`, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
        params: { token: this.apiToken, login },
      });
      const openPositions = this.parseOpenPositionsCsv(response.data);

      console.log("🚀 Open Positions:", openPositions);

      if (openPositions.length === 0 && botInfo.data.tradingDays >= botInfo.data.minimum_trading_days) {
        console.log("🚀 Sending Won event:");
        await this.sendWon(botInfo);
      } else {
        console.log("🚀 CheckWon conditions not met, skipping...");
      }
    } catch (error) {
      console.error("🚨 Error in CheckWon:", error);
    }
  }


  async ConsistencyKOD(botInfo: Job, closedPosition) {
    // console.debug(`ConsistencyKOD started for botInfo: ${JSON.stringify(botInfo)}`);
    if (this.botInfo.data.status !== 'Active') {
      console.log("⚠️ Bot is not active. Skipping ConsistencyKOD logic.", this.botInfo.data.traderLogin);
      return false; // Skip further checks if the bot is not active
    }
    const login = botInfo.data.traderLogin;
    const currentPhase = botInfo.data.Phase; // Assume this is stored in botInfo
    console.info(`Processing ConsistencyKOD for login: ${login}, phase: ${currentPhase}`);
    try {
      // Step 1: Fetch the profit target dynamically for each bot/account
      const phaseSettings = PhaseSettings[botInfo.data.Challenge_type]?.[botInfo.data.Phase];
      if (!phaseSettings) {
        console.error(`Invalid trading phase: ${currentPhase}`);
        throw new Error(`Invalid trading phase: ${currentPhase}`);
      }

      const phaseProfitTarget = parseFloat(phaseSettings.profit_target);
      const maxAllowedProfit = botInfo.data.profitCurrency * botInfo.data.consistencyPercent; // 25% of the profit target
      console.log("🚀 ~ BaseEvaluationService ~ ConsistencyKOD ~ maxAllowedProfit:", maxAllowedProfit)
      //const maxAllowedProfitTarget = (maxAllowedProfit*botInfo.data.Initial_balance)*100;

      console.info(`Account ${login} - Phase: ${currentPhase}, Profit Target: ${botInfo.data.profitCurrency}, Max Allowed Profit per trade: ${maxAllowedProfit}`);

      // // Fetch closed positions
      // const now = new Date();
      // const to = now.toISOString();
      // const from = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

      // console.debug(`Fetching closed positions from ${from} to ${to}`);

      // const response = await axios.get(`${this.spotwareApiUrl}/v2/webserv/closedPositions`, {
      //   headers: { Authorization: `Bearer ${this.apiToken}` },
      //   params: { from, to, token: this.apiToken, login },
      // });

      if (closedPosition.status !== 200 || !closedPosition.data) {
        console.error(`Failed to fetch closed positions for account ${login}. Status: ${closedPosition.status}`);
        throw new Error(`Failed to fetch closed positions for account ${login}.`);
      }

      console.debug(`Closed positions response: ${JSON.stringify(closedPosition.data)}`);

      // Parse and evaluate the response
      const closedPositions = closedPosition.data
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
      // Log and analyze each trade
      closedPositions.forEach((trade) => {
        console.info(
          `Account analyzing for consistencyKOD ${login} - Analyzing trade ${trade.positionId} with PnL: ${trade.pnl}, Max Allowed: ${maxAllowedProfit}`
        );
      });      // Check for violations
      const isConsistencyViolated = closedPositions.some((trade) => {

        console.info(`Account ${login} - Analyzing trade ${trade.positionId} with PnL: ${trade.pnl}, Max Allowed: ${maxAllowedProfit}`);
        return trade.pnl > maxAllowedProfit;
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

        this.sendConsistencyKOD(botInfo)
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
  // async getTradingDays() {
  //   try {
  //     const prevDataResponse = await axios.get(`${process.env.xanoEquityUrl}?account=${this.botInfo.data.accountId}`, {
  //       headers: { 'Content-Type': 'application/json' },
  //     });
  //     // const prevDataResponse = await this.httpService
  //     // .get(`${process.env.xanoEquityUrl}?account=${this.botInfo.data.accountId}`, {
  //     //   headers: { 'Content-Type': 'application/json' },
  //     // });
  //     console.log("🚀 ~ BaseEvaluationService ~ getTradingDays ~ prevDataResponse:", prevDataResponse)
  //     return prevDataResponse.data;
  //   }
  //   catch (error) {
  //     console.log("🚀 ~ BaseEvaluationService ~ getTradingDays ~ error:", error)
  //   }
  // }
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
      const prevDataResponse = await axios.get(`${this.xanoEquityUrl}/${accountId}/`)
      console.log("🚀 ~ BaseEvaluationService ~ getDailyEquity ~ prevDataResponse:", date, prevDataResponse.data.starting_daily_equity)
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
  async sendDailyKOD(botInfo: Job) {
    try {
      botInfo.data.request_type = "DailyKOD";
      botInfo.data.status = "Failed";
      botInfo.data.challenge_won = "false";
      botInfo.data.challenge_ends = dayjs(Date.now()).format('YYYY-MM-DD');
      botInfo.data.daily_kod = "true",
        botInfo.data.total_kod = "false"


      await this.rulesEvaluation(botInfo);


      if (botInfo.data.status === 'Failed') {
        console.log('Bot status found sendDailyKOD', botInfo.data.traderLogin, botInfo.data.status);

        await this.IAccountInterface.UpdateAccount(botInfo.data);
        console.log('Bot status found for DailyKOD', botInfo.data.status);
        await this.IBotInterface.stopBot(botInfo.data);
        // await this.stopChallenge(botInfo);
      }
      return;

    }

    catch (error) {
      console.log("🚀 ~ BaseEvaluationService ~ sendDailyKOD ~ error:", error)
    }
  }
  async sendTotalKOD(botInfo: Job) {
    try {
      botInfo.data.request_type = "TotalKOD";
      botInfo.data.status = "Failed";
      botInfo.data.challenge_won = "false";
      botInfo.data.challenge_ends = dayjs(Date.now()).format('YYYY-MM-DD');
      botInfo.data.daily_kod = "false",
        botInfo.data.total_kod = "true"
      botInfo.data.accessRights = "NO_TRADING"

      await this.rulesEvaluation(botInfo);


      if (botInfo.data.status === 'Failed') {
        console.log('Bot status found sendTotalKOD', botInfo.data.traderLogin, botInfo.data.status);

        await this.IAccountInterface.UpdateAccount(botInfo.data);
        console.log('Bot status found for SendTotalKOD', botInfo.data.status);
        await this.IBotInterface.stopBot(botInfo.data);
        // await this.stopChallenge(botInfo);
      }
      return;

    }
    catch (error) {
      console.log("🚀 ~ BaseEvaluationService ~ sendTotalKOD ~ error:", error)
    }
  }
  async sendConsistencyKOD(botInfo: Job) {
    try {
      botInfo.data.request_type = "ConsistencyKOD";
      botInfo.data.status = "Failed";
      botInfo.data.challenge_won = "false";
      botInfo.data.challenge_ends = dayjs(Date.now()).format('YYYY-MM-DD');
      botInfo.data.daily_kod = "false",
        botInfo.data.total_kod = "false",
        botInfo.data.consistency_kod = "true"
      botInfo.data.accessRights = "NO_TRADING"
      await this.rulesEvaluation(botInfo);

      if (botInfo.data.status === 'Failed') {
        console.log('Bot status found for ConsistencyKOD', botInfo.data.traderLogin, botInfo.data.status); {

          await this.IAccountInterface.UpdateAccount(botInfo.data);
          console.log('Bot status found for sendConsistencyKOD', botInfo.data.status);
          await this.IBotInterface.stopBot(botInfo.data);
          // await this.stopChallenge(botInfo);

        }
        return;

      }

    }
    catch (error) {
      console.log("🚀 ~ BaseEvaluationService ~ ConsistencyKOD ~ error:", error)
    }
  }
  async retainImportantData(botdata) {
    // Define the fields to retain
    const fieldsToRetain = [
      "email",
      "Initial_balance",
      "Currency",
      "Challenge_type",
      "preferredLanguage",
      "Leverage",
      "ChallengeID",
      "Phase"
    ];

    // Create a filtered object with only retained fields
    const retainedData = Object.keys(botdata)
      .filter((key) => fieldsToRetain.includes(key))
      .reduce((obj, key) => {
        // Divide Initial_balance by 100 if the key is 'Initial_balance'
        if (key === 'Initial_balance') {
          obj[key] = botdata[key];
        } else {
          obj[key] = botdata[key];
        }
        return obj;
      }, {} as Record<string, any>);

    // Update the job data with only retained fields
    //await botInfo.update(retainedData);
    //console.log("Updated job data",botInfo.data);

    console.log("Retained data in job:", retainedData);
    return retainedData;
  }
  private phaseSwitchCount: number = 0; // Tracks how many times a phase switch occurs
  private runBotCount: number = 0; // Tracks how many times a bot is run

  // Add methods to expose counters for external reporting/debugging
  getPhaseSwitchCount(): number {
    return this.phaseSwitchCount;
  }

  getRunBotCount(): number {
    return this.runBotCount;
  }

  async sendWon(botInfo: Job) {
    try {
      botInfo.data.request_type = "Won";
      botInfo.data.status = "Won";
      botInfo.data.challenge_won = "true";
      botInfo.data.challenge_ends = dayjs(Date.now()).format('YYYY-MM-DD');
      botInfo.data.daily_kod = "false";
      botInfo.data.total_kod = "false";
      botInfo.data.accessRights = "NO_TRADING";



      console.log(`Switching from ${botInfo.data.Phase}`, botInfo.data.Phase === process.env.testPhase);

      const retainedData = await this.retainImportantData(botInfo.data);
      console.log(`Switching Phase before stop bot ${retainedData.Phase}`, retainedData.Phase === process.env.testPhase);
      await this.rulesEvaluation(botInfo);
      if (botInfo.data.status === 'Won') {

        await this.IAccountInterface.UpdateAccount(botInfo.data);
        console.log('Bot status found for SenDWon', botInfo.data.status);
        await this.IBotInterface.stopBot(botInfo.data);
        // await this.stopChallenge(botInfo);
        console.log(`Switching from after stopbot ${retainedData.Phase}`, retainedData.Phase === process.env.testPhase);
        console.log(`Stopping bot for phase: ${botInfo.data.Phase}`);

        // // Initialize a variable to track whether a bot should be run
        // let nextPhase: string | undefined;
        // let shouldRunBot = false;

        // // Track whether the bot was run
        // let botRunOnce = false;

        // switch (retainedData.Phase) {
        //   case process.env.testPhase:
        //     nextPhase = process.env.Phase_0;
        //     console.log(`Switching from test to ${nextPhase}`);
        //     shouldRunBot = true;
        //     break;

        //   case process.env.Phase_0:
        //     nextPhase = process.env.Phase_1;
        //     console.log(`Switching from Phase 0 to ${nextPhase}`);
        //     shouldRunBot = true;
        //     break;

        //   case process.env.Phase_1:
        //     nextPhase = process.env.Phase_2;
        //     console.log(`Switching from Phase 1 to ${nextPhase}`);
        //     shouldRunBot = true;
        //     break;

        //   case process.env.Phase_2:
        //     nextPhase = process.env.Funded;
        //     console.log(`Switching from Phase 2 to ${nextPhase}`);
        //     shouldRunBot = true;
        //     break;

        //   default:
        //     console.log(`User has completed all phases. Current phase: ${retainedData.Phase}`);
        //     await this.rulesEvaluation(botInfo);
        //     return; // Exit if all phases are complete
        // }

        // Perform phase transition only if needed
        // if (shouldRunBot && !botRunOnce) {
        // Increment phase switch count
        await this.phaseSwitchCount++;
        console.log(`🔄 Phase Switch Count: ${this.phaseSwitchCount}`);

        // retainedData.Phase = nextPhase; // Set the next phase for the bot
        // console.log(`Switching to ${retainedData.Phase}, ${nextPhase}`);

        // Run the bot for the next phase
        await this.IBotInterface.RunBot(retainedData);

        // Increment bot run count
        await this.runBotCount++;
        console.log(`▶️ Run Bot Count: ${this.runBotCount}`);

        // Mark the bot as having run once
        // botRunOnce = true;

        // Exit the function immediately after one bot run
        console.log("🚪 Exiting after one bot run.");
        return;
      }
      // } return;
    } catch (error) {
      console.log("🚀 ~ BaseEvaluationService ~ sendWon ~ error:", error);
    }
  }


  // async stopChallenge(botInfo: Job) {
  //   try {
  //     // Stop the bot
  //     botInfo.data.running = false;
  //     const temp = botInfo.data;
  //     botInfo.update(temp);
  //     console.log("⛔️ Bot running Stopped in StopChallege");

  //     // Use the trader login from botInfo
  //     const traderLogin = botInfo.data.traderLogin; // Ensure traderLogin exists in botInfo.data
  //     await this.IAccountInterface.UpdateAccount(traderLogin);


  //     // console.log(`✅ Access rights updated to NO_TRADING for trader ${traderLogin}`,response.data);;


  //     // Additional bot stopping logic if required
  //     await this.IBotInterface.stopBot(botInfo.data);
  //   } catch (error) {
  //     console.error("🚀 ~ BaseEvaluationService ~ stopChallenge ~ error:", error.response?.data || error.message);
  //   }
  // }


}
