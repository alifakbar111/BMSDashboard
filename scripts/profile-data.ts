import * as fs from "fs";
import * as path from "path";



function profileCSV(filePath: string): void {
  const content = fs.readFileSync(filePath, "utf-8").trim();
  const lines = content.split("\n");
  const headers = lines[0].split(",");
  const rows = lines.slice(1);

  console.log(`\n=== ${path.basename(filePath)} ===`);
  console.log(`Rows: ${rows.length}, Columns: ${headers.length}`);

  for (const header of headers) {
    const values = rows.map((row) => {
      const cols = row.split(",");
      const idx = headers.indexOf(header);
      return cols[idx]?.trim() ?? "";
    });
    const nonNull = values.filter((v) => v.length > 0).length;
    const unique = new Set(values);
    const numValues = values.map(Number).filter((n) => !isNaN(n));

    console.log(`  ${header}: ${nonNull}/${rows.length} non-null, ${unique.size} unique`);
    if (numValues.length > 0) {
      const avg = numValues.reduce((a, b) => a + b, 0) / numValues.length;
      console.log(
        `    range: ${Math.min(...numValues)} - ${Math.max(...numValues)}, avg: ${avg.toFixed(2)}`,
      );
    }
    console.log(`    samples: ${[...unique].slice(0, 3).join(", ")}`);
  }
}

const dataDir = path.resolve(__dirname, "../data");
const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".csv"));
for (const file of files) {
  profileCSV(path.join(dataDir, file));
}
