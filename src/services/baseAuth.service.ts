import { IAuthInterface } from "./Interfaces/IAuth.interface";
import { HttpService } from "@nestjs/axios";

export abstract class AuthService implements IAuthInterface{
    constructor(protected httpService: HttpService){}
async getToken(req: any) {
    try{
        const url = process.env.tokenUrl;
        const headers = {
            "Accept":"application/json"
        };
        console.log("🚀 ~ AuthService ~ getToken ~ headers:", headers)
        const token = await this.httpService.axiosRef.post(`${url}`,req, { headers: headers });
        return token;
    }
    catch(error){
        console.log("error in token generate- ", error)
    }
}
}