import { InventoryItem } from "./index";

export const validateInventory = (inventory: InventoryItem[]): string[] => {
  const errors: string[] = [];

  inventory.forEach((item, index) => {
    const itemKey = item.Item || '';
    if (!item.Owner) {
      errors.push(`Item at index ${index} (key: ${itemKey}) is missing the 'Owner' field.`);
    }
    if (!item.Stock && item.Stock !== 0) {
      errors.push(`Item at index ${index} (key: ${itemKey}) is missing the 'Stock' field.`);
    }
    if (!item.Item) {
      errors.push(`Item at index ${index} (key: ${itemKey}) is missing the 'Item' field.`);
    }
    if (item.buy && (Number.isNaN(item.buy.quantity) || Number.isNaN(item.buy.value))) {
      errors.push(`Item at index ${index} (key: ${itemKey}) has an invalid 'buy' field.`);
    }
    if (item.sell && (Number.isNaN(item.sell.quantity) || Number.isNaN(item.sell.value))) {
      errors.push(`Item at index ${index} (key: ${itemKey}) has an invalid 'sell' field.`);
    }
    if (item.Enchants && !Array.isArray(item.Enchants)) {
      errors.push(`Item at index ${index} (key: ${itemKey}) has an invalid 'Enchants' field.`);
    }
    if (item.RepairCost && typeof item.RepairCost !== "number") {
      errors.push(`Item at index ${index} (key: ${itemKey}) has an invalid 'RepairCost' field.`);
    }
  });

  return errors;
};