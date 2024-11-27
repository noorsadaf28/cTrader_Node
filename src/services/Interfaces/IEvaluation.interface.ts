import { Injectable } from '@nestjs/common';
import * as protobuf from 'protobufjs';
import { Socket } from 'net';
import * as tls from 'tls';
import * as net from 'net';
export interface IEvaluationInterface{
    // subscribeToSpotQuotes(payload);
    // unsubscribeFromSpotQuotes(subscriptionId);
    subscribeToSpotQuotes(botInfo)
    rulesEvaluation(body);
    dailyKOD(req)
    symbolList (symbols)
    getDailyEquity(accountId)
    ConsistencyKOD(botInfo, closedPosition)
}