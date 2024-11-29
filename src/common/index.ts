const chatLogPrefix = "[Render thread/INFO]: [System] [CHAT]";

export interface InventoryItem {
  Owner: string;
  Stock: number;
  Item: string;
  buy: {
    quantity: number;
    value: number;
  };
  sell?: {
    quantity: number;
    value: number;
  };
  Enchants?: string[];
  RepairCost?: number;
}

// Define the JSON structure
export interface ShopItem {
  Owner: string;
  Stock: number;
  Item: string;
  buy: {
    quantity: number;
    value: number;
  };
  sell?: {
    quantity: number;
    value: number;
  };
  RepairCost?: number;
  Enchants?: string[];
}

export const cleanupLogFile = (lines: Array<string>): Array<string> => {
  const cleanedLines = lines.reduce((acc: Array<string>, line: string) => {
    if (line.includes(chatLogPrefix)) {
      acc.push(line.split(chatLogPrefix)[1].trim());
    }
    return acc;
  }, []);

  return cleanedLines;
};

export const parseShopData = (lines: Array<string>): ShopItem[] => {
  const shopItems: ShopItem[] = [];
  let currentItem: ShopItem | null = null;

  lines.forEach((line: string) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith("Shop Information:")) {
      return; // Skip the header
    }
    if (trimmedLine.startsWith("Owner:")) {
      if (currentItem) shopItems.push(currentItem);
      currentItem = {
        Owner: trimmedLine.split(":")[1].trim(),
        Stock: 0,
        Item: "",
        buy: { quantity: 0, value: 0 },
      };
    } else if (trimmedLine.startsWith("Stock:")) {
      currentItem!.Stock = parseInt(trimmedLine.split(":")[1].trim());
    } else if (trimmedLine.startsWith("Item:")) {
      currentItem!.Item = trimmedLine
        .split(":")[1]
        .trim()
        .replace(/[\[\]]/g, "");
    } else if (trimmedLine.startsWith("Buy")) {
      const match = /Buy (\d+) for (\d+) Coins/.exec(trimmedLine);
      if (match) {
        currentItem!.buy = {
          quantity: parseInt(match[1]),
          value: parseInt(match[2]),
        };
      }
    } else if (trimmedLine.startsWith("Sell")) {
      const match = /Sell (\d+) for (\d+) Coins/.exec(trimmedLine);
      if (match) {
        currentItem!.sell = {
          quantity: parseInt(match[1]),
          value: parseInt(match[2]),
        };
      }
    } else if (trimmedLine.startsWith("Repair Cost:")) {
      currentItem!.RepairCost = parseInt(trimmedLine.split(":")[1].trim());
    } else if (trimmedLine && currentItem) {
      const enchantPattern = /^[A-Za-z]+(?: [A-Za-z]+)? [IVXLCDM]+$/;
      if (enchantPattern.test(trimmedLine)) {
        currentItem.Enchants = currentItem.Enchants || [];
        currentItem.Enchants.push(trimmedLine);
      }
    }
  });

  if (currentItem) shopItems.push(currentItem); // Add the last item

  return shopItems;
};

export const flattenItem = (item: InventoryItem): Record<string, any> => {
  const flat: Record<string, any> = {
    Owner: item.Owner,
    Stock: item.Stock,
    Item: item.Item,
    BuyQuantity: item.buy.quantity,
    BuyValue: item.buy.value,
    SellQuantity: item.sell?.quantity || null,
    SellValue: item.sell?.value || null,
    Enchants: item.Enchants ? item.Enchants.join(", ") : null,
    RepairCost: item.RepairCost || null,
  };
  return flat;
};
