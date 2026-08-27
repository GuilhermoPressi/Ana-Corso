import { readFileSync, writeFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

const root = process.env.PROJECT_ROOT
const assetsDir = join(root, "dist-demo/assets")
const files = readdirSync(assetsDir)

const jsFile = files.find((f) => f.endsWith(".js"))
const cssFile = files.find((f) => f.endsWith(".css"))
if (!jsFile || !cssFile) throw new Error("build artifacts not found: " + files.join(", "))

const js = readFileSync(join(assetsDir, jsFile), "utf8")
const css = readFileSync(join(assetsDir, cssFile), "utf8")

// Uma sequência "</script" dentro de string literal encerraria a tag no parser HTML.
const safeJs = js.replaceAll("</script", "<\\/script")

const out = `<meta charset="utf-8" />
<title>Ana Corso</title>
<meta name="description" content="Plataforma de gestão para clínicas de estética — demonstração navegável." />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
<style>
${css}
</style>

<div id="root"></div>

<script type="module">
${safeJs}
</script>
`

const target = process.env.OUT_FILE
writeFileSync(target, out)
console.log("wrote", target, (out.length / 1024 / 1024).toFixed(2), "MB")
