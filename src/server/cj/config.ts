export const CJ_API_BASE =
  process.env.CJ_API_BASE ??
  "https://developers.cjdropshipping.com/api2.0/v1";

export const CJ_BATCH_DELAY_MS = Number(process.env.CJ_BATCH_DELAY_MS) || 120;
