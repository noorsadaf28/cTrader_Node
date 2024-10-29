import { Controller } from '@nestjs/common';
import {  Get, HttpCode, HttpStatus, UseGuards,Body,Post,Param } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IEvaluationInterface } from 'src/services/Interfaces/IEvaluation.interface';


@Controller()
export class EvaluationController {

    constructor(@Inject('IEvaluationInterface') private readonly IEvaluationInterface:IEvaluationInterface) {}


    // @HttpCode(HttpStatus.OK)
    // @Post('onTickHistory')
    // async onTickHistory()
    // {
    //   try{
    //     const symbols = ["BTC","ETH"];
    //     const subscriptionId = "jsdn";
    //     const response = await this.IEvaluationInterface.subscribeToSpotQuotes(symbols, subscriptionId);
    //     console.log("🚀 ~ EvaluationController ~onTickHistory ~ response:", response)
    //     return response;
    //   }
    //   catch(error){
    //     console.log("error in tick------", error)
    //   }
  //   }
    @HttpCode(HttpStatus.OK)
    @Post('subscribe')
    async subscribeToQuotes(
    // @Body('symbols') symbols: string[],
    // @Body('symbolId') symbolId:[],
    // @Body('subscriptionId') subscriptionId: string,
  ) {
    const subscribePayload = {
      payloadType: 601, // You can use an enum if defined
      ctidTraderAccountId:3000186,
      symbolId: [101, 102], // List of symbol IDs
      subscribeToSpotTimestamp: true // If you want timestamps
    };
    return this.IEvaluationInterface.subscribeToSpotQuotes(subscribePayload);
  }
  @HttpCode(HttpStatus.OK)
  @Post('unsubscribe/:subscriptionId')
  async unsubscribeFromQuotes(@Param('subscriptionId') subscriptionId: string) {
    return this.IEvaluationInterface.unsubscribeFromSpotQuotes(subscriptionId);
  }
    
}
