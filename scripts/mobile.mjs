// Serveur de développement pour Expo Go (téléphone), distinct du serveur web.
// Affiche le QR code dans le terminal et sert le bundle natif sur le port 8081.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = process.argv[2] ?? "8081";

console.log("Serveur mobile Covoit'Church depuis " + projectRoot);

const child = spawn("npx", ["expo", "start", "--port", port], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    // Metro manque de mémoire avec le tas par défaut sur ce poste.
    NODE_OPTIONS: [process.env.NODE_OPTIONS, "--max-old-space-size=4096"]
      .filter(Boolean)
      .join(" "),
    CI: "1", // évite le menu interactif, garde la sortie lisible
  },
});

child.on("exit", (code) => process.exit(code ?? 0));
