import { Controller } from '@nestjs/common';
import {  Get, HttpCode, HttpStatus, UseGuards,Body,Post,Param } from '@nestjs/common';
import { Inject } from '@nestjs/common';


@Controller()
export class EvaluationController {

    constructor() {}


    @HttpCode(HttpStatus.OK)
    @Post('onTickHistory')
    async onTickHistory()
    {
      //const response = await this.IExchangeService.AccountInfo(apiReq);
    //   console.log("🚀 ~ ExchangeController ~accountInfo ~ response:", response)
    //   return response;
    }
    
}
