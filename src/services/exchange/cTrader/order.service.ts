import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { CreateOrderDto } from 'src/dto/create-order.dto';
import {IOrderInterface } from 'src/services/Interfaces/IOrder.interface';
import { BaseOrderService } from 'src/services/baseOrder.service';

@Injectable()
export class CtraderOrderService extends BaseOrderService{
  
}
