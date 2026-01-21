export default function parseDurationToMs(value: string): number {
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error("Invalid duration format");

  const amount = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case "s": return amount * 1000;
    case "m": return amount * 60_000;
    case "h": return amount * 60 * 60_000;
    case "d": return amount * 24 * 60 * 60_000;
    default: throw new Error("Unsupported duration unit");
  }
}
