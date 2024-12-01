# Stoneworks Utilities

[![Build Status](https://github.com/Maldaris/sw-market-utils/actions/workflows/test-runner.yml/badge.svg)](https://github.com/Maldaris/sw-market-utils/actions)

Visit the hosted version of the site: [autism.industries](https://autism.industries)

Stoneworks Utilities provides tools to parse and convert shop log files from the Stoneworks server into JSON and CSV formats. It supports both .log files and .gz archives.
The app optionally supports an API for uploading and managing inventory data and statistics using Digital Ocean's Spaces for storage.

## Requirements

Node v18+

## Setup

1. Clone the project
2. Install dependencies

```bash
npm install
```

3. Create a .env file in the root directory and add the following environment variables:

    ```bash
    DISCORD_CLIENT_ID=your_discord_client_id
    DISCORD_CLIENT_SECRET=your_discord_client_secret
    DISCORD_REDIRECT_URI=your_discord_redirect_uri
    DO_SPACES_KEY=your_digital_ocean_spaces_key
    DO_SPACES_SECRET=your_digital_ocean_spaces_secret
    DO_SPACES_BUCKET=your_digital_ocean_spaces_bucket
    ```

4. Start the application in either web mode or use via the CLI:

```bash
# run as a web application
npm run dev

# run via the cli
npm run cli -- ./input.log ./output
```

## API Documentation

### Authentication

**GET /auth/discord**
Redirects the user to Discord for authentication.

**GET /auth/discord/callback**
Handles the callback from Discord after authentication.

### Inventory

**POST /inventory**
Uploads inventory data.

- Headers:
  - Content-Type: application/json
- Body:

```json
[
  {
    "Owner": "string",
    "Stock": 0,
    "Item": "string",
    "buy": {
      "quantity": 0,
      "value": 0
    },
    "sell": {
      "quantity": 0,
      "value": 0
    },
    "Enchants": ["string"],
    "RepairCost": 0
  }
]
```

**Responses:**

- `200 OK`: Inventory saved successfully.
- `400 Bad Request`: Validation errors.
- `401 Unauthorized`: User not authenticated.
- `500 Internal Server Error`: Failed to save inventory.
