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
}
