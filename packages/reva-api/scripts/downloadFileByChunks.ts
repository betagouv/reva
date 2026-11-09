import * as fs from "fs";

// Le serveur n'autorise pas les requêtes HEAD, donc on utilise une requête GET
// avec un Range header pour obtenir la taille du fichier.
async function getFileSizeViaRange(url: string): Promise<number> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Range: "bytes=0-0", // Request only the first byte
    },
  });

  // Le code 206 indique que le serveur a renvoyé du contenu partiel
  // On attend donc d'avoir un 206 en retour, sinon les requêtes Range ne sont pas supportées
  if (response.status !== 206) {
    throw new Error(
      `Server does not support range requests. Status: ${response.status}`,
    );
  }

  // On récupère le header Content-Range qui contient la taille du fichier
  const contentRange = response.headers.get("content-range");
  if (!contentRange) {
    throw new Error("Server returned 206 but missing content-range header.");
  }

  // Content-Range format: "bytes 0-0/12345678"
  const match = contentRange.match(/\/(\d+)$/);
  if (!match) {
    throw new Error(
      `Could not parse total size from content-range: ${contentRange}`,
    );
  }

  return parseInt(match[1], 10);
}

async function downloadLargeFileInChunks(url: string, destPath: string) {
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB example limit

  const totalSize = await getFileSizeViaRange(url);

  if (!totalSize) {
    throw new Error(
      "Server did not return a content-length header. Cannot calculate chunks.",
    );
  }

  console.log(`File size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

  const writeStream = fs.createWriteStream(destPath);

  // 2. Download and append chunks sequentially
  for (let start = 0; start < totalSize; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE - 1, totalSize - 1);

    console.log(`Downloading bytes ${start}-${end}...`);

    const response = await fetch(url, {
      headers: {
        Range: `bytes=${start}-${end}`,
      },
    });

    if (!response.ok && response.status !== 206) {
      // 206 Partial Content is expected
      throw new Error(
        `Failed to fetch chunk ${start}-${end}: ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    // Write chunk to the file stream
    if (!writeStream.write(Buffer.from(arrayBuffer))) {
      // Handle backpressure if the disk is slower than the network
      await new Promise<void>((resolve) => writeStream.once("drain", resolve));
    }
  }

  writeStream.end();
  console.log("Download complete.");
}

// Usage
downloadLargeFileInChunks("<url>", "./local-file.pdf");
