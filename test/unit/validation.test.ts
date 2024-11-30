import { validateInventory } from '../../src/common/validation';
import { InventoryItem } from '../../src/common/index';

describe('validateInventory', () => {
  it('should return an error if the Owner field is missing', () => {
    const inventory: InventoryItem[] = [
      {
        Owner: '',
        Stock: 10,
        Item: 'Diamond Sword',
        buy: { quantity: 1, value: 1000 },
      },
    ];
    const errors = validateInventory(inventory);
    expect(errors).toContain("Item at index 0 (key: Diamond Sword) is missing the 'Owner' field.");
  });

  it('should return an error if the Stock field is missing', () => {
    const inventory: InventoryItem[] = [
      {
        Owner: 'Troniq',
        Stock: undefined as any,
        Item: 'Diamond Sword',
        buy: { quantity: 1, value: 1000 },
      },
    ];
    const errors = validateInventory(inventory);
    expect(errors).toContain("Item at index 0 (key: Diamond Sword) is missing the 'Stock' field.");
  });

  it('should return an error if the Item field is missing', () => {
    const inventory: InventoryItem[] = [
      {
        Owner: 'Troniq',
        Stock: 10,
        Item: '',
        buy: { quantity: 1, value: 1000 },
      },
    ];
    const errors = validateInventory(inventory);
    expect(errors).toContain("Item at index 0 (key: ) is missing the 'Item' field.");
  });

  it('should return an error if the buy field is invalid', () => {
    const inventory: InventoryItem[] = [
      {
        Owner: 'Troniq',
        Stock: 10,
        Item: 'Diamond Sword',
        buy: { quantity: NaN, value: NaN },
      },
    ];
    const errors = validateInventory(inventory);
    expect(errors).toContain("Item at index 0 (key: Diamond Sword) has an invalid 'buy' field.");
  });

  it('should return an error if the sell field is invalid', () => {
    const inventory: InventoryItem[] = [
      {
        Owner: 'Troniq',
        Stock: 10,
        Item: 'Diamond Sword',
        buy: { quantity: 1, value: 1000 },
        sell: { quantity: NaN, value: NaN },
      },
    ];
    const errors = validateInventory(inventory);
    expect(errors).toContain("Item at index 0 (key: Diamond Sword) has an invalid 'sell' field.");
  });

  it('should return an error if the Enchants field is invalid', () => {
    const inventory: InventoryItem[] = [
      {
        Owner: 'Troniq',
        Stock: 10,
        Item: 'Diamond Sword',
        buy: { quantity: 1, value: 1000 },
        Enchants: 'Fire Aspect II' as any,
      },
    ];
    const errors = validateInventory(inventory);
    expect(errors).toContain("Item at index 0 (key: Diamond Sword) has an invalid 'Enchants' field.");
  });

  it('should return an error if the RepairCost field is invalid', () => {
    const inventory: InventoryItem[] = [
      {
        Owner: 'Troniq',
        Stock: 10,
        Item: 'Diamond Sword',
        buy: { quantity: 1, value: 1000 },
        RepairCost: '3' as any,
      },
    ];
    const errors = validateInventory(inventory);
    expect(errors).toContain("Item at index 0 (key: Diamond Sword) has an invalid 'RepairCost' field.");
  });

  it('should return no errors for a valid inventory item', () => {
    const inventory: InventoryItem[] = [
      {
        Owner: 'Troniq',
        Stock: 10,
        Item: 'Diamond Sword',
        buy: { quantity: 1, value: 1000 },
        sell: { quantity: 1, value: 500 },
        Enchants: ['Fire Aspect II', 'Sharpness V'],
        RepairCost: 3,
      },
    ];
    const errors = validateInventory(inventory);
    expect(errors).toHaveLength(0);
  });
});