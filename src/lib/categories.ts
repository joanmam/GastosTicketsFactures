export const CATEGORIES = [
  "Alimentació",
  "Restaurants",
  "Transport",
  "Salut",
  "Llar",
  "Roba",
  "Lleure",
  "Tecnologia",
  "Subscripcions",
  "Educació",
  "Viatges",
  "Altres",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const PAYMENT_METHODS = [
  "Targeta",
  "Efectiu",
  "Transferència",
  "Domiciliació",
  "Altres",
] as const;
