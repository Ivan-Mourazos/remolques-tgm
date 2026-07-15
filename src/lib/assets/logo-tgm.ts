import { readFileSync } from "node:fs";
import { join } from "node:path";

let logoDataUri: string | null | undefined;

/** Logo corporativo listo para incrustar en PDF y Excel sin depender de una URL. */
export function getLogoTgmDataUri(): string | null {
  if (logoDataUri !== undefined) return logoDataUri;
  try {
    const bytes = readFileSync(join(process.cwd(), "public", "logo-tgm-transparent.png"));
    logoDataUri = `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    logoDataUri = null;
  }
  return logoDataUri;
}
