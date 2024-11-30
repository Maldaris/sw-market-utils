import express, {
  Request,
  Response,
  NextFunction,
  EnhancedRequest,
} from "express";
import axios from "axios";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import bodyParser from "body-parser";
import winston from "winston";
import fs from "fs";
import dotenv from "dotenv";
import { InventoryItem } from "../common";
import { validateInventory } from "../common/validation";

dotenv.config();



declare module "express" {
  interface SessionData {
    user: {
      id: string;
      username: string;
      discriminator: string;
      avatar: string;
    };
  }

  type EnhancedRequest = Request & {
    session: SessionData;
  };
}

const s3Client = new S3Client({
  endpoint: "https://nyc3.digitaloceanspaces.com",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY as string,
    secretAccessKey: process.env.DO_SPACES_SECRET as string,
  },
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

const retry = async (fn: () => Promise<any>, retries = 3): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === retries - 1) throw error;
      logger.warn(`Retry ${i + 1}/${retries} failed: ${error.message}`);
    }
  }
};

export const authDiscord = (req: Request, res: Response) => {
  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID as string;
  const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI as string;
  const DISCORD_API_URL = "https://discord.com/api/v8";

  const authorizeUrl = `${DISCORD_API_URL}/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${DISCORD_REDIRECT_URI}&response_type=code&scope=identify`;
  res.redirect(authorizeUrl);
};

export const authDiscordCallback = async (req: Request, res: Response) => {
  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID as string;
  const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET as string;
  const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI as string;
  const DISCORD_API_URL = "https://discord.com/api/v8";

  const code = req.query.code as string;
  try {
    const tokenResponse = await retry(() =>
      axios.post(
        `${DISCORD_API_URL}/oauth2/token`,
        new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: DISCORD_REDIRECT_URI,
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      )
    );

    const userResponse = await retry(() =>
      axios.get(`${DISCORD_API_URL}/users/@me`, {
        headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
      })
    );
    (req as EnhancedRequest).session = {} as any;
    (req as EnhancedRequest).session.user = userResponse.data;
    res.redirect("/"); // Redirect to the home page or dashboard
  } catch (error: any) {
    logger.error(`Authentication failed: ${error.message}`);
    res.status(500).send("Authentication failed");
  }
};

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if ((req as EnhancedRequest).session?.user) {
    next();
  } else {
    res.status(401).send("Unauthorized");
  }
};

const updateIndexFile = async (inventory: InventoryItem[]) => {
  const indexKey = "inventory/index.json";
  let indexData: Record<string, any> = {};

  try {
    const indexObject = await retry(() =>
      s3Client.send(
        new GetObjectCommand({
          Bucket: process.env.DO_SPACES_BUCKET as string,
          Key: indexKey,
        })
      )
    );
    const body = await indexObject.Body?.transformToString();
    indexData = JSON.parse(body!);
  } catch (error: any) {
    if (error.name !== "NoSuchKey") {
      throw error;
    }
  }

  inventory.forEach((item: InventoryItem) => {
    const sortedEnchants = item.Enchants ? item.Enchants.sort().join(", ") : "";
    const itemKey = item.Item + (sortedEnchants ? ` (${sortedEnchants})` : "");
    if (!indexData[itemKey]) {
      indexData[itemKey] = { highestBuy: 0, lowestSell: Infinity };
    }
    if (item.buy.value > indexData[itemKey].highestBuy) {
      indexData[itemKey].highestBuy = item.buy.value;
    }
    if (item.sell && item.sell.value < indexData[itemKey].lowestSell) {
      indexData[itemKey].lowestSell = item.sell.value;
    }
  });

  const params = new PutObjectCommand({
    Bucket: process.env.DO_SPACES_BUCKET as string,
    Key: indexKey,
    Body: JSON.stringify(indexData),
    ContentType: "application/json",
  });

  await retry(() => s3Client.send(params));
};

export const postInventory = async (req: Request, res: Response) => {
  const inventory: InventoryItem[] = req.body;

  const validationErrors = validateInventory(inventory);
  if (validationErrors.length > 0) {
    return res.status(400).json({ errors: validationErrors });
  }

  const params = new PutObjectCommand({
    Bucket: process.env.DO_SPACES_BUCKET as string,
    Key: `inventory/${
      (req as EnhancedRequest).session.user.id
    }.${Date.now()}.json`,
    Body: JSON.stringify(inventory),
    ContentType: "application/json",
  });

  try {
    await retry(() => s3Client.send(params));
    await updateIndexFile(inventory);
    res.status(200).send("Inventory saved successfully");
  } catch (error: any) {
    logger.error(`Failed to save inventory: ${error.message}`);
    res.status(500).send("Failed to save inventory");
  }
};

export const uploadLogFile = async () => {
  const logFilePath = "combined.log";
  const logKey = "logs/combined.log";

  try {
    const logData = await fs.promises.readFile(logFilePath);
    const params = new PutObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET as string,
      Key: logKey,
      Body: logData,
      ContentType: "text/plain",
    });

    await retry(() => s3Client.send(params));
    logger.info("Log file uploaded successfully");
  } catch (error: any) {
    logger.error(`Failed to upload log file: ${error.message}`);
  }
};

export const createApp = () => {
  const app = express();
  app.use(bodyParser.json());

  app.get("/auth/discord", authDiscord);
  app.get("/auth/discord/callback", authDiscordCallback);
  app.post("/inventory", authenticate, postInventory);

  return app;
};

if (require.main === module) {
  const requiredEnvVars = [
    "DISCORD_CLIENT_ID",
    "DISCORD_CLIENT_SECRET",
    "DISCORD_REDIRECT_URI",
    "DO_SPACES_KEY",
    "DO_SPACES_SECRET",
    "DO_SPACES_BUCKET",
  ];

  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      console.error(`Error: Missing required environment variable ${varName}`);
      process.exit(1);
    }
  }

  const app = createApp();
  app.listen(3000, () => {
    logger.info("Server is running on port 3000");
    setInterval(uploadLogFile, 60 * 60 * 1000); // Upload log file every hour
  });
}

export default createApp;
