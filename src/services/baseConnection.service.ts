import { IConnectionInterface } from "./Interfaces/IConnection.interface";
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as net from 'net';
import * as protobuf from 'protobufjs';
import * as tls from 'tls';

export abstract class BaseConnectionService implements IConnectionInterface{
    private client: tls.TLSSocket;
  private root: protobuf.Root;
  private heartbeatInterval: NodeJS.Timer;

  async onModuleInit() {
    try{
        // Load Protobuf definitions
        this.root = await protobuf.load('path-to-your-protofile.proto');

        // Establish TCP connection
        await this.connectToCTrader();
    }
   catch(error){
    console.log("Error in onModuleInit: ",error)
   }
  }
  async connectToCTrader() {
    const proxyHost = process.env.host;
    const proxyPort = parseInt(process.env.port);

    // Establish a TCP connection with SSL
    const client = new net.Socket();
    client.connect(proxyPort, proxyHost, () => {
      console.log('Connected to cTrader Manager API');
      this.client = tls.connect({
        socket: client,
        rejectUnauthorized: false,
      }, () => {
        console.log('SSL connection established');
        this.sendHeartbeat();
      });

      this.client.on('data', (data: Buffer) => {
        this.handleMessage(data);
      });
    });

    client.on('error', (err) => {
      console.error('Connection error:', err);
    });
  }
  // Handle incoming messages
  handleMessage(data: Buffer) {
    // Extract the length of the message from the first 4 bytes
    const length = data.readUInt32BE(0);
    const messageBuffer = data.slice(4, 4 + length);

    // Deserialize the message using Protobuf
    const ProtoMessage = this.root.lookupType('ProtoMessage');
    const decodedMessage = ProtoMessage.decode(messageBuffer);

    console.log('Received message:', decodedMessage);
    
    // Handle different payload types based on `payloadType`
    this.processPayload(decodedMessage);
  }
  // Process the payload inside ProtoMessage
  processPayload(protoMessage: any) {
    const payloadType = protoMessage.payloadType;
    const payloadBuffer = protoMessage.payload;

    // Assuming you have different message types defined in your Proto schema
    if (payloadType === 1) { // Example: Heartbeat event
      const HeartbeatEvent = this.root.lookupType('ProtoHeartbeatEvent');
      const heartbeat = HeartbeatEvent.decode(payloadBuffer);
      console.log('Received Heartbeat:', heartbeat);
    }
    // Handle other payloads...
  }
  // Send heartbeat message every 25 seconds
  sendHeartbeat() {
    const HeartbeatEvent = this.root.lookupType('ProtoHeartbeatEvent');
    const heartbeatMessage = HeartbeatEvent.create({}); // Create a new heartbeat message

    const message = this.createProtoMessage(1, heartbeatMessage); // 1 is the payloadType for heartbeat

    // Serialize and send the message to the server
    this.sendMessage(message);

    this.heartbeatInterval = setInterval(() => {
      this.sendMessage(message);
      console.log('Sent Heartbeat');
    }, 25000);
  }
  // Helper to create ProtoMessage
  createProtoMessage(payloadType: number, payload: any) {
    const ProtoMessage = this.root.lookupType('ProtoMessage');

    const payloadBuffer = ProtoMessage.encode(payload).finish();
    const message = ProtoMessage.create({
      payloadType: payloadType,
      payload: payloadBuffer,
    });

    return message;
  }

  // Send a message to the API
  sendMessage(message: any) {
    const messageBuffer = this.root.lookupType('ProtoMessage').encode(message).finish();
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(messageBuffer.length, 0);

    const data = Buffer.concat([lengthBuffer, messageBuffer]);

    this.client.write(data);
  }

//   onModuleDestroy() {
//     if (this.heartbeatInterval) {
//       clearInterval(this.heartbeatInterval);
//     }
//     if (this.client) {
//       this.client.end();
//     }
//   }
}