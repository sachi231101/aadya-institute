import fs from "fs";
import path from "path";

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Usage: node fix-pagecontainer-closes.mjs <files...>");
  process.exit(1);
}

for (const file of files) {
  let c = fs.readFileSync(file, "utf8");
  const opens = (c.match(/<PageContainer[\s>]/g) || []).length;
  const closes = (c.match(/<\/PageContainer>/g) || []).length;
  if (opens <= closes) {
    console.log("OK", file);
    continue;
  }

  const idx = c.indexOf("<PageContainer");
  if (idx === -1) continue;
  const returnIdx = c.lastIndexOf("return (", idx);
  const slice = c.slice(returnIdx);
  const closeMatch = slice.match(/\n(\s*)<\/div>(\s*\n\s*\);\s*\n\};)/);
  if (!closeMatch) {
    console.log("NO MATCH", file);
    continue;
  }
  const replacement = `\n${closeMatch[1]}</PageContainer>${closeMatch[2]}`;
  c = c.slice(0, returnIdx) + slice.replace(/\n(\s*)<\/div>(\s*\n\s*\);\s*\n\};)/, replacement);
  fs.writeFileSync(file, c);
  console.log("FIXED", file);
}
