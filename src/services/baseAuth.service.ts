import axios from "axios";
import { IAuthInterface } from "./Interfaces/IAuth.interface";
import { HttpService } from "@nestjs/axios";

export abstract class AuthService implements IAuthInterface{
    constructor(protected httpService: HttpService){}
async getToken(req: any) {
    try{
        const url = process.env.tokenUrl;
        const token = await axios.post(url,req);
        return token.data;
    }
    catch(error){
        console.log("error in token generate- ", error)
    }
}
}