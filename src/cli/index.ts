import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { Parser } from '@json2csv/plainjs';
import { cleanupLogFile, parseShopData, flattenItem, ShopItem } from '../common';

export function getPathWithoutExtension(filePath: string): string {
  if (!filePath.includes(".")) return filePath;
  if (filePath.endsWith(".")) return filePath.slice(0, -1);
  if (filePath.endsWith(".json")) return filePath.slice(0, -5);
  if (filePath.endsWith(".csv")) return filePath.slice(0, -4);
  if (filePath.endsWith(".gz")) return filePath.slice(0, -3);
  return filePath;
}

export async function processFiles(input: string, output: string): Promise<void> {
  let content = "";

  if (input.endsWith('.gz')) {
    const buffer = await fs.promises.readFile(input);
    const decompressedStream = new Response(buffer).body!.pipeThrough(new DecompressionStream('gzip'));
    const reader = decompressedStream.getReader();
    const decoder = new TextDecoder();
    let result = await reader.read();
    while (!result.done) {
      content += decoder.decode(result.value, { stream: true });
      result = await reader.read();
    }
    content += decoder.decode();
    processContent(content, output);
  } else {
    const readStream = fs.createReadStream(input, "utf8");

    readStream.on("data", (chunk: string) => {
      content += chunk;
    });

    readStream.on("end", () => processContent(content, output));

    readStream.on("error", (err: NodeJS.ErrnoException) => {
      console.error("Error reading file:", err);
    });
  }
}

async function processContent(content: string, output: string) {
  const lines = content.split("\n");
  const cleanedLines = cleanupLogFile(lines.filter(line => line.includes("[CHAT]")));
  const shopItems: ShopItem[] = parseShopData(cleanedLines);
  const jsonOutputPath = `${getPathWithoutExtension(output)}.json`;
  const csvOutputPath = `${getPathWithoutExtension(output)}.csv`;

  try {
    await fs.promises.writeFile(jsonOutputPath, JSON.stringify(shopItems, null, 2), "utf8");
    console.log(`JSON file written to ${path.resolve(jsonOutputPath)}`);

    const flatData = shopItems.map(flattenItem);
    const csv = (new Parser({ header: true })).parse(flatData);

    await fs.promises.writeFile(csvOutputPath, csv, "utf8");
    console.log(`CSV file written to ${path.resolve(csvOutputPath)}`);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Error writing files:", err);
    }
  }
}

if (require.main === module) {
  yargs
    .command(
      "$0 <input> <output>",
      "Process the input file and generate output files",
      {
        input: {
          alias: 'i',
          type: "string",
          demandOption: true,
          description: "Path to the input file.",
        },
        output: {
          alias: 'o',
          type: "string",
          demandOption: true,
          description: "Path to the output file. The JSON and CSV files will be written with this filename.",
        },
      },
      (argv: { input: string, output: string }) => {
        processFiles(argv.input, argv.output);
      }
    )
    .demandCommand(1, "You need to specify a command")
    .help()
    .alias("help", "h")
    .version(false)
    .parse();
}