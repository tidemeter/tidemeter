import { createWriteStream, existsSync } from "node:fs";
import { mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const rootDir = process.cwd();
const outputPath = path.resolve(
  rootDir,
  process.env.GEOIP_DB_PATH || "./data/GeoLite2-City.mmdb",
);
const geoDir = path.dirname(outputPath);

const accountId = process.env.MAXMIND_ACCOUNT_ID;
const licenseKey = process.env.MAXMIND_LICENSE_KEY;

// Optional: lets self-hosters provide their own MMDB URL.
// Supports a direct .mmdb URL or a .tar.gz archive URL.
const customUrl = process.env.GEO_DATABASE_URL;

function isTarGz(url) {
  return new URL(url).pathname.endsWith(".tar.gz");
}

async function download(url, destination) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": "tidemeter-geoip-downloader",
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(
      `Failed to download GeoIP database: ${response.status} ${response.statusText}`,
    );
  }

  await pipeline(
    Readable.fromWeb(response.body),
    createWriteStream(destination),
  );
}

async function main() {
  await mkdir(geoDir, { recursive: true });

  if (existsSync(outputPath) && process.env.FORCE_GEO_DOWNLOAD !== "1") {
    console.log(`[geoip] Database already exists: ${outputPath}`);
    console.log("[geoip] Set FORCE_GEO_DOWNLOAD=1 to download again.");
    return;
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), "tidemeter-geoip-"));

  try {
    let url = customUrl;

    if (!url && accountId && licenseKey) {
      const query = new URLSearchParams({
        edition_id: "GeoLite2-City",
        license_key: licenseKey,
        suffix: "tar.gz",
      });

      url = `https://download.maxmind.com/app/geoip_download?${query}`;
    }

    if (!url) {
      throw new Error(
        [
          "No GeoIP download source configured.",
          "Set MAXMIND_ACCOUNT_ID and MAXMIND_LICENSE_KEY,",
          "or set GEO_DATABASE_URL to a direct .mmdb or .tar.gz URL.",
        ].join(" "),
      );
    }

    if (isTarGz(url)) {
      const archivePath = path.join(tempDir, "GeoLite2-City.tar.gz");

      console.log("[geoip] Downloading GeoLite2 City archive...");
      await download(url, archivePath);

      console.log("[geoip] Extracting database...");
      await execFileAsync("tar", ["-xzf", archivePath, "-C", tempDir]);

      const { stdout } = await execFileAsync("find", [
        tempDir,
        "-name",
        "GeoLite2-City.mmdb",
        "-type",
        "f",
        "-print",
        "-quit",
      ]);

      const extractedPath = stdout.trim();

      if (!extractedPath) {
        throw new Error(
          "Archive downloaded successfully, but GeoLite2-City.mmdb was not found.",
        );
      }

      await rename(extractedPath, outputPath);
    } else {
      const temporaryDatabasePath = path.join(tempDir, "GeoLite2-City.mmdb");

      console.log("[geoip] Downloading GeoLite2 City database...");
      await download(url, temporaryDatabasePath);

      await rename(temporaryDatabasePath, outputPath);
    }

    console.log(`[geoip] Saved database: ${outputPath}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("[geoip] Download failed.");
  console.error(error);
  process.exit(1);
});
