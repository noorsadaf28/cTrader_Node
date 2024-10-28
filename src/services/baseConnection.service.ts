import { IConnectionInterface } from "./Interfaces/IConnection.interface";
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as net from 'net';
import * as protobuf from 'protobufjs';
import * as tls from 'tls';

export abstract class BaseConnectionService implements IConnectionInterface{
//     private client: tls.TLSSocket;
//   private root: protobuf.Root;
//   private heartbeatInterval: NodeJS.Timer;
//   readonly #sizeLength: number;
//     #size?: number;
//     #tail?: Buffer;
//     readonly #names: any;
//     readonly #payloadTypes: {
//       [key: string]: any;
//   };
    
//     #decodeHandler?: (...parameters: any[]) => any;
//   constructor(){
//     this.#sizeLength = 4;
//         this.#size = undefined;
//         this.#tail = undefined;
//         this.#decodeHandler = undefined;
//         this.#names = {};
//         this.#payloadTypes = {};
//   }

//   async onModuleInit() {
//     try{
//         // Load Protobuf definitions
//         this.root = await protobuf.load('./protobufs/CommonMessages_External.proto');

//         // Establish TCP connection
//         await this.connectToCTrader();
//     }
//    catch(error){
//     console.log("Error in onModuleInit: ",error)
//    }
//   }
//   async connectToCTrader() {
//     try{
//         const proxyHost = process.env.host;
//         const proxyPort = parseInt(process.env.port);
    
//         // Establish a TCP connection with SSL
//         const client = new net.Socket();
//         client.connect(proxyPort, proxyHost, () => {
//           console.log('Connected to cTrader Manager API');
//           this.client = tls.connect({
//             socket: client,
//             rejectUnauthorized: false,
//           }, () => {
//             console.log('SSL connection established');
//             this.sendHeartbeat();
//           });
    
//           this.client.on('data', (data: Buffer) => {
//             //this.handleMessage(data);
//           });
//         });
    
//         client.on('error', (err) => {
//           console.error('Connection error:', err);
//         });
//     }
//     catch(error){
//         console.log("Error in connect to ctrader : ", error);
//     }
    
//   }
//   //Handle incoming messages
//   handleMessage(data: Buffer) {
//     try{
//         // Extract the length of the message from the first 4 bytes
//     const length = data.readUInt32BE(0);
//     const messageBuffer = data.slice(4, 4 + length);

//     // Deserialize the message using Protobuf
//     const ProtoMessage = this.root.lookupType('ProtoMessage');
//     const decodedMessage = this.decode(messageBuffer);

//     console.log('Received message:', decodedMessage);
    
//     // Handle different payload types based on `payloadType`
//     this.processPayload(decodedMessage);
//     }
//     catch(error)
//     {
//         console.log("Error in handle message : ", error)
//     }
//   }
// // Initialize an empty buffer to store incomplete message data
// //private messageBuffer: Buffer = Buffer.alloc(0);

// // handleMessage(data: Buffer) {
// //     try {
// //         // Append new data to the accumulated message buffer
// //         this.messageBuffer = Buffer.concat([this.messageBuffer, data]);

// //         // Check if the accumulated buffer has at least 4 bytes to read the message length
// //         if (this.messageBuffer.length < 4) return;

// //         // Extract the length of the message from the first 4 bytes
// //         const length = this.messageBuffer.readUInt32BE(0);

// //         // Check if the entire message has arrived
// //         if (this.messageBuffer.length < 4 + length) return; // Wait for more data

// //         // Extract the full message (4 bytes for length + message length)
// //         const fullMessage = this.messageBuffer.slice(4, 4 + length);

// //         // Deserialize the message using Protobuf
// //         const ProtoMessage = this.root.lookupType('ProtoMessage');
// //         const decodedMessage = ProtoMessage.decode(fullMessage);

// //         console.log('Received message:', decodedMessage);

// //         // Process different payload types based on `payloadType`
// //         this.processPayload(decodedMessage);

// //         // Remove the processed message from the buffer
// //         this.messageBuffer = this.messageBuffer.slice(4 + length);

// //         // Recursively call handleMessage in case multiple messages are in the buffer
// //         if (this.messageBuffer.length > 4) this.handleMessage(Buffer.alloc(0));
// //     } catch (error) {
// //         console.error("Error in handleMessage:", error);
// //     }
// // }


//   // Process the payload inside ProtoMessage
//   processPayload(protoMessage: any) {
//     const payloadType = protoMessage.payloadType;
//     const payloadBuffer = protoMessage.payload;

//     // Assuming you have different message types defined in your Proto schema
//     if (payloadType === 1) { // Example: Heartbeat event
//       const HeartbeatEvent = this.root.lookupType('ProtoHeartbeatEvent');
//       const heartbeat = HeartbeatEvent.decode(payloadBuffer);
//       console.log('Received Heartbeat:', heartbeat);
//     }
//     // Handle other payloads...
//   }
//   // Send heartbeat message every 25 seconds
//   sendHeartbeat() {
//     try{
//         const HeartbeatEvent = this.root.lookupType('ProtoHeartbeatEvent');
//         const heartbeatMessage = HeartbeatEvent.create({}); // Create a new heartbeat message
    
//         const message = this.createProtoMessage(1, heartbeatMessage); // 1 is the payloadType for heartbeat
//         //console.log("message--------------", message)
//         // Serialize and send the message to the server
//         this.sendMessage(message);
    
//         this.heartbeatInterval = setInterval(() => {
//           this.sendMessage(message);
//           console.log('Sent Heartbeat');
//         }, 25000);
//     }
//     catch(error){
//         console.log("Error in send heart beat: ", error)
//     }
    
//   }
//   // Helper to create ProtoMessage
//   createProtoMessage(payloadType: number, payload: any) {
//     const ProtoMessage = this.root.lookupType('ProtoMessage');

//     const payloadBuffer = ProtoMessage.encode(payload).finish();
//     const message = ProtoMessage.create({
//       payloadType: payloadType,
//       payload: payloadBuffer,
//     });

//     return message;
//   }

//   // Send a message to the API
//   sendMessage(message: any) {
//     const messageBuffer = this.root.lookupType('ProtoMessage').encode(message).finish();
//     const lengthBuffer = Buffer.alloc(4);
//     lengthBuffer.writeUInt32BE(messageBuffer.length, 0);

//     const data = Buffer.concat([lengthBuffer, messageBuffer]);

//     this.client.write(data);
//   }
//   public decode (buffer: GenericObject): any {
//     console.log("here")
//     const protoMessage = this.getMessageByName("ProtoMessage").decode(buffer);
//     const payloadType = protoMessage.payloadType;
//     console.log(payloadType)

//     return {
//         payload: this.getMessageByPayloadType(payloadType).decode(protoMessage.payload),
//         payloadType: payloadType,
//         clientMsgId: protoMessage.clientMsgId,
//     };
// }
// public getMessageByName (name: string): any {
//   return this.#names[name].messageBuilded;
// }

// public getPayloadTypeByName (name: string): number {
//   return this.#names[name].payloadType;
// }
// public getMessageByPayloadType (payloadType: number): any {
//   return this.#payloadTypes[payloadType].messageBuilded;
// }

// //   onModuleDestroy() {
// //     if (this.heartbeatInterval) {
// //       clearInterval(this.heartbeatInterval);
// //     }
// //     if (this.client) {
// //       this.client.end();
// //     }
// //   }
}