export enum TradingPhases {
  PHASE_0 = '0 Phase',
  PHASE_1 = '1st Phase',
  PHASE_2 = '2nd Phase',
  FUNDED = 'Funded',
  TESTPHASE = "TestPhase"
}

export enum AccountConfig {
  ACCOUNT_ID = "0",
  REQUEST_TYPE = "",
  METATRADER_PLATFORM = "CTrader",
  STATUS_ACTIVE = "",
  CHALLENGE_WON_FALSE = "false",
  DAILY_KOD_FALSE = "false",
  TIME_EXCEEDED_FALSE = "false",
  CHALLENGE_EXTENDED_FALSE = "false",
  TOTAL_KOD_FALSE = "false",
  EA_DATE_FORMAT = "yyyy.mm.dd",
  EA_DATETIME_FORMAT = "yyyy.mm.dd hh:mm",
  EXTEND_CHALLENGE_TRUE = "true",
  CHALLENGE_EXTRA_DAYS = "0",
  PROFIT_TO_EXTEND = "0"
}

export const PhaseSettings = {
  [TradingPhases.PHASE_0]: {
      max_daily_loss: "20",
      max_loss: "40",
      profit_target: "5",
      minimum_trading_days: "5",
      max_trading_days: "0",
      max_daily_currency: "",
      max_total_currency: "",
      starting_daily_equity: "",
      leverageInCents: "1:2" ,
      consistency_kod:"",
      consistency_value:"25"
  },
  [TradingPhases.PHASE_1]: {
      max_daily_loss: "4",
      max_loss: "8",
      profit_target: "8",
      minimum_trading_days: "5",
      max_trading_days: "0",
      max_daily_currency: "",
      max_total_currency: "",
      starting_daily_equity: "",
      leverageInCents: "1:100", // 1:100 leverage
      consistency_kod:"",
      consistency_value:"25"
  },
  [TradingPhases.PHASE_2]: {
      max_daily_loss: "5",
      max_loss: "10",
      profit_target: "5",
      minimum_trading_days: "4",
      max_trading_days: "0",
      max_daily_currency: "",
      max_total_currency: "",
      starting_daily_equity: "",
      leverageInCents: "1:100",// 1:100 leverage
      consistency_kod:"",
      consistency_value:"25"
  },
  [TradingPhases.FUNDED]: {
      max_daily_loss: "5",
      max_loss: "10",
      profit_target: "0",
      minimum_trading_days: "0",
      max_trading_days: "0",
      max_daily_currency: "",
      max_total_currency: "",
      starting_daily_equity: "",
      leverageInCents: "1:30",// 1:30 leverage
      consistency_kod:"",
      consistency_value:"25"
  },
  [TradingPhases.TESTPHASE]: {
    max_daily_loss: "0.01",
    max_loss: "0.5",
    profit_target: "0.005",
    minimum_trading_days: "2",
    max_trading_days: "0",
    max_daily_currency: "",
    max_total_currency: "",
    starting_daily_equity: "",
    leverageInCents: "1:2",// 1:30 leverage
    consistency_kod:"",
    consistency_value:"25"
}
};
