// Lance le serveur web Expo depuis la racine du projet, quel que soit le repertoire
// courant de l'appelant. Contourne les chemins Windows avec espaces, que `cmd /c cd`
// gere mal quand la commande est passee en un seul argument.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = process.argv[2] ?? "8082";

console.log("Demarrage de Covoit'Church web depuis " + projectRoot);

// Metro tombe en "heap out of memory" avec le tas par defaut sur ce poste :
// on lui laisse de la marge des le lancement.
const child = spawn("npx", ["expo", "start", "--web", "--port", port], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    NODE_OPTIONS: [process.env.NODE_OPTIONS, "--max-old-space-size=4096"]
      .filter(Boolean)
      .join(" "),
  },
});

child.on("exit", (code) => process.exit(code ?? 0));
