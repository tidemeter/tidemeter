import { createWriteStream } from "node:fs";
import { copyFile, mkdir, mkdtemp, rename, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const rootDir = process.cwd();
const editionId = process.env.GEOIP_EDITION_ID || "GeoLite2-City";
const databaseFilename = `${editionId}.mmdb`;
const outputPath = path.resolve(
  rootDir,
  process.env.GEOIP_DB_PATH || `./data/${databaseFilename}`,
);
const geoDir = path.dirname(outputPath);

const accountId = process.env.MAXMIND_ACCOUNT_ID;
const licenseKey = process.env.MAXMIND_LICENSE_KEY;

// Optional: lets self-hosters provide their own MMDB URL.
// Supports a direct .mmdb URL or a .tar.gz archive URL.
const customUrl = process.env.GEO_DATABASE_URL;

async function shouldDownload() {
  if (process.env.FORCE_GEO_DOWNLOAD === "1") {
    return true;
  }

  try {
    const stats = await stat(outputPath);
    const configuredIntervalDays = Number(
      process.env.GEOIP_UPDATE_INTERVAL_DAYS ?? "7",
    );
    const intervalDays =
      Number.isFinite(configuredIntervalDays) && configuredIntervalDays > 0
        ? configuredIntervalDays
        : 7;
    const intervalMs = Math.max(intervalDays, 1) * 24 * 60 * 60 * 1000;

    return Date.now() - stats.mtimeMs >= intervalMs;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "ENOENT") {
        return true;
      }
    }

    throw error;
  }
}

function isTarGz(url) {
  const parsed = new URL(url);

  return (
    parsed.pathname.endsWith(".tar.gz") ||
    parsed.searchParams.get("suffix") === "tar.gz"
  );
}

async function download(url, destination, headers) {
  const response = await fetch(url, {
    redirect: "follow",
    headers,
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

async function replaceDatabase(sourcePath, destinationPath) {
  const temporaryOutputPath = `${destinationPath}.download-${process.pid}`;

  try {
    await copyFile(sourcePath, temporaryOutputPath);
    await rename(temporaryOutputPath, destinationPath);
  } catch (error) {
    await rm(temporaryOutputPath, { force: true });
    throw error;
  }
}

async function main() {
  await mkdir(geoDir, { recursive: true });

  if (!(await shouldDownload())) {
    console.log(`[geoip] Database is current: ${outputPath}`);
    return;
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), "tidemeter-geoip-"));

  try {
    let url = customUrl;
    const headers = {
      "user-agent": "tidemeter-geoip-downloader",
    };

    if (!url && accountId && licenseKey) {
      url = `https://download.maxmind.com/geoip/databases/${editionId}/download?suffix=tar.gz`;
      headers.authorization = `Basic ${Buffer.from(
        `${accountId}:${licenseKey}`,
      ).toString("base64")}`;
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
      const archivePath = path.join(tempDir, `${editionId}.tar.gz`);

      console.log(`[geoip] Downloading ${editionId} archive...`);
      await download(url, archivePath, headers);

      console.log("[geoip] Extracting database...");
      await execFileAsync("tar", ["-xzf", archivePath, "-C", tempDir]);

      const { stdout } = await execFileAsync("find", [
        tempDir,
        "-name",
        databaseFilename,
        "-type",
        "f",
        "-print",
        "-quit",
      ]);

      const extractedPath = stdout.trim();

      if (!extractedPath) {
        throw new Error(
          `Archive downloaded successfully, but ${databaseFilename} was not found.`,
        );
      }

      await replaceDatabase(extractedPath, outputPath);
    } else {
      const temporaryDatabasePath = path.join(tempDir, databaseFilename);

      console.log(`[geoip] Downloading ${editionId} database...`);
      await download(url, temporaryDatabasePath, headers);

      await replaceDatabase(temporaryDatabasePath, outputPath);
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
