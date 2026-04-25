// Plaid often returns merchant names in all caps. Convert those to a
// readable "STARBUCKS COFFEE 1234" -> "Starbucks Coffee 1234" form so
// rows do not shout. Names that already contain lowercase letters are
// left alone, so properly cased brands (e.g. "iRobot") keep their styling.
//
// Lives here because it is shared by every component that renders a
// merchant string. Apply only to merchant names: amounts, account masks,
// and category strings should pass through their own formatters.
export function formatMerchantName(name: string | null | undefined): string {
  if (!name) return 'Unknown merchant'
  if (/[a-z]/.test(name)) return name
  return name
    .toLowerCase()
    .replace(/\b([a-z])/g, (_, c: string) => c.toUpperCase())
}
