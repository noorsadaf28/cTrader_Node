export class ChallengeStatusDTO {
    account: string;
    request_type: 'OnInit' | 'DailyKOD' | 'TotalKOD' | 'Won' | 'Active'; // Added 'Active' here
    metatrader: 'CTrader';
    status: 'Active' | 'Failed' | 'Won';
    challenge_begins: string | null;
    challenge_ends: string | null;
    initial_balance: number;
    max_daily_loss: number;
    max_loss: number;
    profit_target: number;
    minimum_trading_days: number;
    trading_days: number;
    phase: '0 Phase' | '1st Phase' | '2nd Phase' | 'Funded';
    challenge_won: boolean;
    daily_kod: boolean;
    total_kod: boolean;
    equity: number;
    balance: number;
    max_daily_remaining: number;
    max_total_remaining: number;
}
