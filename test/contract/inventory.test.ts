import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import sampleData from '../data/11.29.interios.json';
import { postInventory } from '../../src/api/index';
import { mockClient } from 'aws-sdk-client-mock';
import { Readable } from 'stream';
import { sdkStreamMixin } from '@smithy/util-stream';
import { validateInventory } from '../../src/common/validation';

const S3ClientMock = mockClient(S3Client);

const mockSessionMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  (req as any).session = {
    user: {
      id: '123456789012345678', // Mock Discord user ID format
      username: 'testuser',
      discriminator: '1234',
      avatar: 'avatarhash',
    },
  };
  next();
};

const readableFromStream = (data: string) => {
    const stream = new Readable();
    stream.push(data);
    stream.push(null);
    return sdkStreamMixin(stream);
};


describe('POST /inventory', () => {
  let app: express.Application;
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = { ...originalEnv };
    process.env.DISCORD_CLIENT_ID = 'mockClientId';
    process.env.DISCORD_CLIENT_SECRET = 'mockClientSecret';
    process.env.DISCORD_REDIRECT_URI = 'http://localhost:3000/auth/discord/callback';
    process.env.DO_SPACES_KEY = 'mockSpacesKey';
    process.env.DO_SPACES_SECRET = 'mockSpacesSecret';
    process.env.DO_SPACES_BUCKET = 'mockBucket';

    app = express();
    app.use(bodyParser.json());
    app.use(mockSessionMiddleware);
    app.post('/inventory', postInventory);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    S3ClientMock.reset();
  });

  it('should save inventory and update index file', async () => {
    S3ClientMock.on(PutObjectCommand).resolves({});
    S3ClientMock.on(GetObjectCommand).resolves({ Body: readableFromStream("{}") });

    const response = await request(app)
      .post('/inventory')
      .send(sampleData)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.text).toBe('Inventory saved successfully');

    const expectedInventoryKey = `inventory/123456789012345678`;
    const expectedIndexKey = 'inventory/index.json';

    const inventoryCall = S3ClientMock.call(0);
    const fetchIndexCall = S3ClientMock.call(1);
    const indexCall = S3ClientMock.call(2);

    expect(inventoryCall).toBeDefined();
    expect(inventoryCall.firstArg.input.Key.startsWith(expectedInventoryKey)).toBe(true);
    expect(inventoryCall.firstArg.input.ContentType).toBe('application/json'); 
    expect(inventoryCall.firstArg.input.Body).toBe(JSON.stringify(sampleData));
    expect(fetchIndexCall).toBeDefined();
    expect(fetchIndexCall.firstArg.input.Key).toBe(expectedIndexKey);
    expect(indexCall).toBeDefined();
    expect(indexCall.firstArg.input.Key).toBe(expectedIndexKey);
    expect(indexCall.firstArg.input.ContentType).toBe('application/json');
    
    const indexBody = JSON.parse(indexCall.firstArg.input.Body);
    expect(indexBody).toEqual(expect.any(Object)); // Add more specific checks if needed

    // Ensure at least one key has matching buy & sell prices
    const matchingKey = Object.keys(indexBody).find(key => {
      const item = indexBody[key];
      return item.highestBuy === sampleData.find(data => data.Item === key.split(' (')[0])?.buy.value &&
             item.lowestSell === sampleData.find(data => data.Item === key.split(' (')[0])?.sell?.value;
    });
    expect(matchingKey).toBeDefined();

    // Check for concatenated enchantments
    const enchantedItem = sampleData.find(data => data.Enchants);
    if (enchantedItem) {
      const enchantKey = `${enchantedItem.Item} (${enchantedItem.Enchants!.join(', ')})`;
      expect(indexBody[enchantKey]).toBeDefined();
    }
  });

  it('should update index only when buy price is higher or sell price is lower', async () => {
    const existingIndex = {
      "White Wool": { highestBuy: 100, lowestSell: 60 },
      "Melon Slice": { highestBuy: 20, lowestSell: 40 }
    };

    S3ClientMock.on(GetObjectCommand).resolves({ Body: readableFromStream(JSON.stringify(existingIndex)) });
    S3ClientMock.on(PutObjectCommand).resolves({});

    const response = await request(app)
      .post('/inventory')
      .send(sampleData)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.text).toBe('Inventory saved successfully');

    const indexCall = S3ClientMock.call(2);
    expect(indexCall).toBeDefined();

    const indexBody = JSON.parse(indexCall.firstArg.input.Body);

    // Ensure the index is updated correctly
    expect(indexBody["White Wool"].highestBuy).toBe(200); // Updated because 200 > 100
    expect(indexBody["White Wool"].lowestSell).toBe(50); // Updated because 50 < 60
    expect(indexBody["Melon Slice"].highestBuy).toBe(30); // Updated because 30 > 20
    expect(indexBody["Melon Slice"].lowestSell).toBe(15); // Updated because 15 < 40
  });

  it('should consistently produce the same key for items with the same base item and enchantments', async () => {
    const sampleDataWithEnchants = [
      {
        "Owner": "Troniq",
        "Stock": 1,
        "Item": "Diamond Sword",
        "buy": {
          "quantity": 1,
          "value": 9000
        },
        "Enchants": [
          "Fire Aspect II",
          "Damage All V",
          "Durability III"
        ],
        "sell": {
          "quantity": 1,
          "value": 2000
        }
      },
      {
        "Owner": "Troniq",
        "Stock": 1,
        "Item": "Diamond Sword",
        "buy": {
          "quantity": 1,
          "value": 9000
        },
        "Enchants": [
          "Durability III",
          "Damage All V",
          "Fire Aspect II"
        ],
        "sell": {
          "quantity": 1,
          "value": 2000
        }
      }
    ];

    S3ClientMock.on(GetObjectCommand).resolves({ Body: readableFromStream("{}") });
    S3ClientMock.on(PutObjectCommand).resolves({});

    const response = await request(app)
      .post('/inventory')
      .send(sampleDataWithEnchants)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.text).toBe('Inventory saved successfully');

    const indexCall = S3ClientMock.call(2);
    expect(indexCall).toBeDefined();

    const indexBody = JSON.parse(indexCall.firstArg.input.Body);

    // Check for consistent key generation
    const enchantKey1 = "Diamond Sword (Damage All V, Durability III, Fire Aspect II)";
    const enchantKey2 = "Diamond Sword (Durability III, Damage All V, Fire Aspect II)";

    expect(indexBody[enchantKey1]).toBeDefined();
    expect(indexBody[enchantKey2]).toBeUndefined();
  });

  it('should return validation errors for invalid inventory items', async () => {
    const invalidData = [
      { "Owner": "", "Stock": 1, "Item": "", "buy": { "quantity": NaN, "value": NaN }, "sell": { "quantity": NaN, "value": NaN } }
    ];

    const errors = validateInventory(invalidData);
    expect(errors).toContain("Item at index 0 (key: ) is missing the 'Owner' field.");
    expect(errors).toContain("Item at index 0 (key: ) is missing the 'Item' field.");
    expect(errors).toContain("Item at index 0 (key: ) has an invalid 'buy' field.");
    expect(errors).toContain("Item at index 0 (key: ) has an invalid 'sell' field.");
  });
});
