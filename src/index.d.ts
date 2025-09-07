declare module "*.css";

declare module "solarlunar" {
  type Lunar2SolarRaw = { cYear: number; cMonth: number; cDay: number; isLeap?: boolean };
  type SolarLunarAPI = {
    lunar2solar: (y: number, m: number, d: number, isLeap?: boolean) => Lunar2SolarRaw;
  };
}