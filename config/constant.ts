import * as dotenv from 'dotenv'
dotenv.config();
const exchange = process.env.exchange;
const botType=process.env.botType;
// console.log("🚀 ~ botType:", botType)
// ---------Queue names----------------------
export const evalBotQueue = (exchange == "CTRADER" ? 'ctrader_eval_queue' :'' ) || '';
export const activeBotQueue=(botType == "Evaluation" ? evalBotQueue : evalBotQueue )
export const orderAPi= process.env['orderApi']