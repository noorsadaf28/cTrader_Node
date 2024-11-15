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

  constructor(@Inject('IAccountInterface') private readonly IAccountInterface:IAccountInterface) {}

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
        //this.subscribeToSpotQuotes()
      });
      this.client.setKeepAlive(true, 10000);
      this.client.on('data', (data: Buffer) => {
        this.handleEventData(data);
      });
      this.client.on('end', () => {
        console.log('Connection ended by server');
        this.reconnect();
      });
      
      // Listen for 'close' event, which happens when the connection fully closes
      this.client.on('close', (hadError) => {
        console.log(`Connection closed${hadError ? ' due to an error' : ''}`);
        console.log('Socket destroyed:', this.client.destroyed); // Will be true after the socket is fully closed
      });
    } catch (error) {
      console.error('Error initializing connection:', error);
    }
  }
  // async subscribeToSpotQuotes(botInfo:Job) {
  //   try {
  //     if (!this.root) throw new Error('Protobuf root not loaded');
  //     const symbolIds = await this.symbolList(botInfo.data.symbols)
  //     // Lookup and create a SubscribeSpotQuotesReq message
  //     const SubscribeSpotQuotesReq = this.root.lookupType('ProtoSubscribeSpotQuotesReq');
  //     const ProtoPayloadType =  this.root.lookupEnum("ProtoCSPayloadType");
  //     const ProtoMessage =  this.root2.lookupType("ProtoMessage");

  //     const authPayload = SubscribeSpotQuotesReq.create({
  //       symbolId:symbolIds,
  //       subscribeToSpotTimestamp: true
  //     });
  //     const payloadBuffer = SubscribeSpotQuotesReq.encode(authPayload).finish();
    
  //     // Create a ProtoMessage wrapping the heartbeat
  //     const message = ProtoMessage.create({
  //       payloadType: ProtoPayloadType.values.PROTO_SUBSCRIBE_SPOT_QUOTES_REQ,
  //       payload: payloadBuffer,
  //     });
  //     // const message = SubscribeSpotQuotesReq.create({
  //     //   payloadType: 601,
  //     //   symbolId: 1,
  //     //   subscribeToSpotTimestamp: true
  //     // });
  //     console.log("🚀 ~ BaseEvaluationService ~ subscribeToSpotQuotes ~ message:", message)
  
  //     const messageBuffer = Buffer.from(ProtoMessage.encode(message).finish());

  //     const fullMessage = this.prefixMessageWithLength(messageBuffer);
  
  //     const writeResult = this.client.write(fullMessage);
  //     console.log("Sent subscription request:", writeResult);
  //     if(writeResult){
  //       for (let i = 0; i < botInfo.data.symbols.length; i++) {
  //         if (!botInfo.data.symbolsSubscribed.includes(botInfo.data.symbols[i])) {
  //           botInfo.data.symbolsSubscribed.push(botInfo.data.symbols[i]);
  //         }
  //       }
  //     }
  
  //     // Await server response
  //     return await new Promise((resolve, reject) => {
  //       this.client.once('data', (data: Buffer) => {
  //         console.log("🚀 ~ BaseEvaluationService ~ this.client.once ~ data:", data.toString())
  //         try {
  //           // Extract length-prefixed message
  //           const responseLength = data.readUInt32BE(0);
  //           console.log("🚀 ~ BaseEvaluationService ~ this.client.once ~ responseLength:", responseLength)
  //           const responseBuffer = data.slice(4, 4 + responseLength);
            
  //           // Decode using expected response message type
  //           const SubscribeSpotQuotesRes = this.root.lookupType('ProtoSubscribeSpotQuotesRes');
  //           //const message = SubscribeSpotQuotesRes.create(payload);

  //           //const responseMessage = SubscribeSpotQuotesRes.decode(responseBuffer);
  //           const err = SubscribeSpotQuotesRes.verify(responseBuffer);
  //           console.log("🚀 ~ BaseEvaluationService ~ this.client.once ~ err:", err)
  //           if (err) {
  //             console.log(err)
  //               throw err;
  //           }
  //           const message = SubscribeSpotQuotesRes.decode(messageBuffer);
  //           console.log("🚀 ~ BaseEvaluationService ~ this.client.once ~ message:", message)
  //           //return SubscribeSpotQuotesRes.toObject(message);
  //           //Check for successful subscription response
  //           if (message) {
  //             console.log("Subscription confirmed:", message);
  //             resolve({ message: "Subscription successful" });
  //           } else {
  //             reject(new Error('Unexpected response type'));
  //           }
  //         } catch (error) {
  //           console.error("Decoding error:", error.message);
  //           reject(new Error("Error decoding server response: " + error.message));
  //         }
  //       });
  
  //       // Timeout to avoid hanging indefinitely
  //       setTimeout(() => {
  //         reject(new Error('Subscription request timed out'));
  //       }, 5000);
  //     });
  //   } catch (error) {
  //     console.error('Subscription request failed:', error.message);
  //     return { message: "Subscription request failed", error: error.message };
  //   }
  // }
//   subscribe(req: ProtoSubscribeSpotQuotesReq): ProtoSubscribeSpotQuotesRes {
//     req.symbolId.forEach(id => this.subscriptions.add(id));
//     console.log(`Subscribed to symbols: ${Array.from(this.subscriptions)}`);
    
//     return { payloadType: ProtoCSPayloadType.PROTO_SUBSCRIBE_SPOT_QUOTES_RES };
// }
async subscribeToSpotQuotes(botInfo: Job) {
  try {
    if (!this.root) throw new Error('Protobuf root not loaded');
    
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
    }

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
  console.log("Data received in handleEventData");

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
      console.log("Decoded ProtoSpotEvent:", decodedEvent);
      // Process the decoded spot data
      //this.processSpotData(decodedEvent);
    } catch (error) {
      console.error("Error decoding ProtoSpotEvent:", error.message);
    }
  }
}
  // Process received spot data (e.g., store/display prices)
  private processSpotData(data: any) {
    console.log("🚀 ~ BaseEvaluationService ~ processSpotData ~ data:", data)
    // Assuming the data contains symbol and price
    const symbol = data.ProtoSpotEvent.symbolId.Long.low;
    const ask = data.ProtoSpotEvent.ask.Long.low;
    const bid = data.ProtoSpotEvent.bid.Long.low;
    console.log(`Symbol: ${symbol} | Ask: ${ask} | Bid: ${bid}`);
    // Here, you can store the data in a database or cache as needed
  }
  async authManager(){
    try {
      if (!this.root) throw new Error('Protobuf root not loaded');
  
      // Lookup and create a ProtoManagerAuthReq message
      const ManagerAuthReq = this.root.lookupType('ProtoManagerAuthReq');
      const ProtoPayloadType =  this.root.lookupEnum("ProtoCSPayloadType");
      const ProtoMessage =  this.root2.lookupType("ProtoMessage");

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
    const ProtoHeartbeatEvent =  this.root2.lookupType("ProtoHeartbeatEvent");
    const ProtoMessage =  this.root2.lookupType("ProtoMessage");
    const ProtoPayloadType =  this.root.lookupEnum("ProtoPayloadType");
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
  async rulesEvaluation(botInfo:Job){
    try{
      const accountdata = await this.IAccountInterface.AccountDetails(botInfo.data);
        let ruledata = new RulesRequest;
        const url = process.env.makeEvalURL;
        const phaseSettings = PhaseSettings[botInfo.data.Phase];
        console.log("🚀 ~ BaseEvaluationService ~ rulesEvaluation ~ phaseSettings:", phaseSettings)
        ruledata.account = accountdata.login;
        ruledata.balance = accountdata.balance;
        ruledata.request_type = botInfo.data.request_type;
        ruledata.metatrader = AccountConfig.METATRADER_PLATFORM,
        ruledata.status = botInfo.data.status;
        ruledata.initial_balance = accountdata.balance;
        ruledata.max_daily_loss = phaseSettings.max_daily_loss;
        ruledata.max_loss = phaseSettings.max_loss;
        ruledata.profit_target= phaseSettings.profit_target,
        ruledata.minimum_trading_days = phaseSettings.minimum_trading_days,
        ruledata.max_trading_days = phaseSettings.max_trading_days,
        ruledata.max_daily_currency = phaseSettings.max_daily_currency,
        ruledata.max_total_currency = phaseSettings.max_total_currency,
        ruledata.starting_daily_equity = phaseSettings.starting_daily_equity,
        ruledata.phase = botInfo.data.Phase;
        console.log("🚀 ~ BaseEvaluationService ~ rulesEvaluation ~ ruledata:", ruledata)
        const response = await axios.post(url, ruledata);
        console.log("🚀 ~ BaseEvaluationService ~ rulesEvaluation ~ response:", response.data);
        return response.data;
        
    }
    catch(error){
    console.log("🚀 ~ BaseEvaluationService ~ rulesEvaluation ~ error:", error)

    }
  }
  async symbolList (symbols){
    let symbolID = [];
    try{
      const symbolURL = process.env.symbolURL;
      const response = await axios.get(`${symbolURL}${process.env.token}`);
      response.data.symbol.forEach(totalsymbol => {
        symbols.forEach(symbolList => {
          if(totalsymbol.name == symbolList){
            symbolID.push(totalsymbol.id);
          }
        });
        
      });
      console.log("🚀 ~ BaseEvaluationService ~ symbolList ~ symbolID:", symbolID)
      return symbolID;
    }
    catch(error){
    console.log("🚀 ~ BaseEvaluationService ~ symbolList ~ error:", error.response.data)

    }
  }
  async checkRules(botInfo:Job){
    try{

    }
    catch(error){

    }
  }
  async dailyKOD(req){
    try{
      const result = req.currentEquity - (req.startingDailyEquity - req.maxDailyCurrency) < 0;
      return result;
    }
    catch(error){
      console.log("🚀 ~ BaseEvaluationService ~ dailyKOD ~ error:", error)
      
    }
  }
  async TotalKOD(req){
    try{
      const result = req.currentEquity - (req.startingDailyEquity - req.maxDailyCurrency) < 0;
      return result;
    }
    catch(error){
      console.log("🚀 ~ BaseEvaluationService ~ dailyKOD ~ error:", error)
      
    }
  }
  async ConsistencyKOD(req){
    try{
      const result = req.currentEquity - (req.startingDailyEquity - req.maxDailyCurrency) < 0;
      return result;
    }
    catch(error){
      console.log("🚀 ~ BaseEvaluationService ~ dailyKOD ~ error:", error)
      
    }
  }
  private reconnect() {
    setTimeout(() => {
      console.log('Reconnecting...');
      this.initializeConnection(); // Reinitialize the connection
    }, 1000); // Wait 1 seconds before reconnecting
  }
}
