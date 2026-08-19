/** Converts administrator-entered names into consistent uppercase text. */
export const toUpperCaseName = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleUpperCase();
