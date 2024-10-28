import { IEvaluationInterface } from "./Interfaces/IEvaluation.interface";
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as net from 'net';
import * as protobuf from 'protobufjs';
import * as tls from 'tls';

export abstract class BaseEvaluationService implements IEvaluationInterface, OnModuleInit {
private client: tls.TLSSocket;
  private root: protobuf.Root;
  private messageBuffer: Buffer = Buffer.alloc(0);

  constructor() {}

  async onModuleInit() {
    await this.initializeConnection();
  }

  private async initializeConnection() {
    try {
      // Load Protobuf definitions
      this.root = await protobuf.load('./protobufs/CSMessages_External.proto');
      const proxyHost = process.env.host;
      const proxyPort = parseInt(process.env.port);

      // Establish a secure connection to the server
      const client = new net.Socket();
      // client.connect(proxyPort, proxyHost, () => {
      //   console.log('Connected to server');
      //   this.client = tls.connect(
      //     {
      //       socket: client,
      //       rejectUnauthorized: false,
      //     },
      //     () => {
      //       console.log('SSL connection established');
      //     },
      //   );
      // });

      // // Handle incoming data
      // client.on('data', (data: Buffer) => {
      //   console.log("Raw data received:", data);
      //   this.handleEventData(data);
      // });
      this.client = tls.connect({
        host: proxyHost,
        port: proxyPort,
        rejectUnauthorized: false,
      });
      
      this.client.on('connect', () => {
        console.log('SSL connection established');
      });
      
      this.client.on('data', (data: Buffer) => {
        console.log("Raw data received:", data);
        this.handleEventData(data);
      });
    } catch (error) {
      console.error('Error initializing connection:', error);
    }
  }
  async subscribeToSpotQuotes(payload) {
    try {
      if (!this.root) throw new Error('Protobuf root not loaded');
  
      // Lookup and create a SubscribeSpotQuotesReq message
      const SubscribeSpotQuotesReq = this.root.lookupType('ProtoSubscribeSpotQuotesReq');
      const message = SubscribeSpotQuotesReq.create({
        payloadType: payload.payloadType || 'PROTO_SUBSCRIBE_SPOT_QUOTES_REQ',
        ctidTraderAccountId:payload.ctidTraderAccountId,
        symbolId: payload.symbolId,
        subscribeToSpotTimestamp: payload.subscribeToSpotTimestamp || false
      });
      console.log("🚀 ~ BaseEvaluationService ~ subscribeToSpotQuotes ~ message:", message)
  
      const messageBuffer = Buffer.from(SubscribeSpotQuotesReq.encode(message).finish());

      const fullMessage = this.prefixMessageWithLength(messageBuffer);
  
      const writeResult = this.client.write(fullMessage);
      console.log("Sent subscription request:", writeResult);
  
      // Await server response
      return await new Promise((resolve, reject) => {
        this.client.once('data', (data: Buffer) => {
          try {
            // Extract length-prefixed message
            const responseLength = data.readUInt32BE(0);
            console.log("🚀 ~ BaseEvaluationService ~ this.client.once ~ responseLength:", responseLength)
            const responseBuffer = data.slice(4, 4 + responseLength);
            
            // Decode using expected response message type
            const SubscribeSpotQuotesRes = this.root.lookupType('ProtoSubscribeSpotQuotesRes');
            //const message = SubscribeSpotQuotesRes.create(payload);

            //const responseMessage = SubscribeSpotQuotesRes.decode(responseBuffer);
            const err = SubscribeSpotQuotesRes.verify(responseBuffer);
            console.log("🚀 ~ BaseEvaluationService ~ this.client.once ~ err:", err)
            if (err) {
              console.log(err)
                throw err;
            }
            const message = SubscribeSpotQuotesRes.decode(messageBuffer);
            console.log("🚀 ~ BaseEvaluationService ~ this.client.once ~ message:", message)
            //return SubscribeSpotQuotesRes.toObject(message);
            //Check for successful subscription response
            if (message) {
              console.log("Subscription confirmed:", message);
              resolve({ message: "Subscription successful" });
            } else {
              reject(new Error('Unexpected response type'));
            }
          } catch (error) {
            console.error("Decoding error:", error.message);
            reject(new Error("Error decoding server response: " + error.message));
          }
        });
  
        // Timeout to avoid hanging indefinitely
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
  // private handleEventData(data: Buffer) {
  //   console.log("Data received in handleEventData");
  
  //   // Append new data to the existing buffer
  //   this.messageBuffer = Buffer.concat([this.messageBuffer, data]);
  
  //   while (true) {
  //     if (this.messageBuffer.length < 4) {
  //       console.log("Insufficient data for length prefix");
  //       return;
  //     }
  
  //     const length = this.messageBuffer.readUInt32BE(0);
  //     console.log("Message length prefix:", length);
  
  //     if (this.messageBuffer.length < 4 + length) {
  //       console.log("Waiting for full message data...");
  //       return;
  //     }
  
  //     const eventDataBuffer = this.messageBuffer.slice(4, 4 + length);
  //     const ProtoSpotEvent = this.root.lookupType('ProtoSpotEvent');
      
  //     try {
  //       const decodedEvent = ProtoSpotEvent.decode(eventDataBuffer);
  //       console.log("Decoded ProtoSpotEvent:", decodedEvent);
  
  //       this.processSpotData(decodedEvent);
  //     } catch (error) {
  //       console.error("Error decoding ProtoSpotEvent:", error);
  //     }
  
  //     this.messageBuffer = this.messageBuffer.slice(4 + length);
  //   }
  // }
  // Handle incoming data, process ProtoSpotEvent messages
private handleEventData(data: Buffer) {
  console.log("Data received in handleEventData");

  // Append new data to the existing buffer
  this.messageBuffer = Buffer.concat([this.messageBuffer, data]);

  while (true) {
    // Check if we have enough data for the message length prefix
    if (this.messageBuffer.length < 4) {
      console.log("Insufficient data for length prefix, waiting for more data.");
      return;
    }

    // Read the length prefix
    const length = this.messageBuffer.readUInt32BE(0);
    console.log("Message length prefix:", length);

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
      this.processSpotData(decodedEvent);
    } catch (error) {
      console.error("Error decoding ProtoSpotEvent:", error.message);
    }
  }
}

  

  // Process received spot data (e.g., store/display prices)
  private processSpotData(data: any) {
    // Assuming the data contains symbol and price
    const { symbol, price, timestamp } = data;
    console.log(`Symbol: ${symbol} | Price: ${price} | Timestamp: ${timestamp}`);
    // Here, you can store the data in a database or cache as needed
  }
}
