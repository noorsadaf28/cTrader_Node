import { HttpStatus } from "@nestjs/common";
import { Body, Controller, HttpCode, Inject, Post } from "@nestjs/common/decorators";
import { IAuthInterface } from "src/services/Interfaces/IAuth.interface";

@Controller()
export class AuthController {
    constructor(@Inject('IAuthInterface') private readonly IAuthInterface:IAuthInterface){}
    @HttpCode(HttpStatus.OK)
    @Post('getToken')
    async TokenGenerate(@Body() body) 
    {
        try{
            const response = await this.IAuthInterface.getToken(body);
            console.log("🚀 ~ AuthController ~ response:", response)
            return response;
        }
        catch(error){
            console.log("🚀 ~ AuthController ~ error:", error)
        }
    }
}
