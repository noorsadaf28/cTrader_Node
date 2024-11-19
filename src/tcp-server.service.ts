import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as net from 'net';

@Injectable()
export class TcpServerService implements OnModuleInit, OnModuleDestroy {
  private server: net.Server;

  onModuleInit() {
    this.createServer();
  }

  onModuleDestroy() {
    this.server.close(() => {
      console.log('TCP Server closed.');
    });
  }

  private createServer() {
    this.server = net.createServer((socket) => {
      console.log('Client connected:', socket.remoteAddress);

      // Handle incoming data
      socket.on('data', (data) => {
        console.log('Received data:', data.toString());
        socket.write(`Echo: ${data}`);
      });

      // Handle client disconnection
      socket.on('end', () => {
        console.log('Client disconnected.');
      });

      // Handle errors
      socket.on('error', (err) => {
        console.error('Socket error:', err.message);
      });
    });

    this.server.listen(3001, () => {
      console.log('TCP Server is listening on port 3001.');
    });
  }
}
