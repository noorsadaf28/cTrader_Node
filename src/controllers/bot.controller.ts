import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from "@nestjs/common";
import { IBotInterface } from "src/services/Interfaces/IBot.interface";

@Controller()
export class BotController {
    constructor(@Inject('IBotInterface') private readonly IBotInterface:IBotInterface){}
    @HttpCode(HttpStatus.OK)
    @Post('startBot')
    async StartBot(@Body() body) 
    {
        try{
            const response = await this.IBotInterface.RunBot(body);
            return response;
        }
        catch(error){
        }
    }
    @HttpCode(HttpStatus.OK)
    @Post('stopAllBots')
    async StopAllBots() 
    {
        try{
            const response = await this.IBotInterface.stopAllBots();
            return response;
        }
        catch(error){
        }
    }
    @HttpCode(HttpStatus.OK)
    @Post('activebots')
    async GetActiveBots(){
        try{
            const response = await this.IBotInterface.ActiveBotIds();
            return response;
        }
        catch(error){
            console.log("🚀 ~ BotController ~ GetActiveBots ~ error:", error)
            
        }
    }
    @HttpCode(HttpStatus.OK)
    @Post('stopBot')
    async StopBot(@Body() Body){
        try{
            return await this.IBotInterface.stopBot(Body)
        }
        catch(error) {
        console.log("🚀 ~ BotController ~ StopBot ~ error:", error)
        }
    }
}
