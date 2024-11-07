import { Controller } from '@nestjs/common';
import {  Get, HttpCode, HttpStatus, UseGuards,Body,Post,Param } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IEvaluationInterface } from 'src/services/Interfaces/IEvaluation.interface';


@Controller()
export class EvaluationController {

    constructor(@Inject('IEvaluationInterface') private readonly IEvaluationInterface:IEvaluationInterface) {}

    @HttpCode(HttpStatus.OK)
    @Post('subscribe')
    async subscribeToQuotes() {
    const subscribePayload = {
      payloadType: 601, // You can use an enum if defined
      ctidTraderAccountId:3000186,
      symbolId: [101, 102], // List of symbol IDs
      subscribeToSpotTimestamp: true // If you want timestamps
    };
   // return this.IEvaluationInterface.subscribeToSpotQuotes(subscribePayload);
  }
  @HttpCode(HttpStatus.OK)
  @Post('unsubscribe/:subscriptionId')
  async unsubscribeFromQuotes(@Param('subscriptionId') subscriptionId: string) {
    //return this.IEvaluationInterface.unsubscribeFromSpotQuotes(subscriptionId);
  }
  @HttpCode(HttpStatus.OK)
  @Post('rulesEvaluation')
  async rulesEvaluation(@Body() body) {
    try{
      return this.IEvaluationInterface.rulesEvaluation(body);
    }
    catch(error){
      console.log("🚀 ~ EvaluationController ~ rulesEvaluation ~ error:", error)
      
    }
  }
    
}
