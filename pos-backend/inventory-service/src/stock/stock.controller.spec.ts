import { StockController } from './stock.controller';

describe('StockController stock adjustment and transfer logic', () => {
  let controller: StockController;
  let supabaseService: { getClient: jest.Mock };
  let rabbitMQService: { publishStockLow: jest.Mock };

  beforeEach(() => {
    supabaseService = { getClient: jest.fn() };
    rabbitMQService = { publishStockLow: jest.fn() };
    controller = new StockController(supabaseService as any, rabbitMQService as any);
  });

  const mockFetchAndUpdate = (product: any, updatedProduct: any) => {
    const client = {
      from: jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: product, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: updatedProduct, error: null }),
              }),
            }),
          }),
        }),
    };
    supabaseService.getClient.mockReturnValue(client);
    return client;
  };

  it('increments stock when amount is positive', async () => {
    mockFetchAndUpdate(
      { id: 1, name: 'Coffee', stock: 10, low_stock_threshold: 5 },
      { id: 1, stock: 15 },
    );

    const result = await controller.adjustStock({ sku: 1, amount: 5, reason: 'Restock' });

    expect(result).toEqual({ success: true, sku: 1, newStock: 15 });
    expect(rabbitMQService.publishStockLow).not.toHaveBeenCalled();
  });

  it('decrements stock when amount is negative', async () => {
    mockFetchAndUpdate(
      { id: 1, name: 'Coffee', stock: 10, low_stock_threshold: 3 },
      { id: 1, stock: 6 },
    );

    const result = await controller.adjustStock({ sku: 1, amount: -4, reason: 'Sale' });

    expect(result).toEqual({ success: true, sku: 1, newStock: 6 });
  });

  it('emits stock.low when adjusted stock is below threshold', async () => {
    const product = { id: 1, name: 'Coffee', stock: 10, low_stock_threshold: 5 };
    mockFetchAndUpdate(product, { id: 1, stock: 4 });

    await controller.adjustStock({ sku: 1, amount: -6, reason: 'Sale' });

    expect(rabbitMQService.publishStockLow).toHaveBeenCalledWith(product, 4);
  });

  it('creates a stock transfer request', async () => {
    const requestBody = {
      product_id: 1,
      product_name: 'Coffee',
      quantity_transfer: 3,
      transfer_status: 'Pending',
      requested_by: 'Cashier 1',
      destination_branch_id: 2,
      destination_branch_name: 'Branch 2',
    };
    const insertedTransfer = { id: 99, ...requestBody };

    const client = {
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: insertedTransfer, error: null }),
          }),
        }),
      }),
    };
    supabaseService.getClient.mockReturnValue(client);

    const result = await controller.transferStock(requestBody);

    expect(client.from).toHaveBeenCalledWith('requesttransfers');
    expect(result).toEqual({ transfer: insertedTransfer });
  });
});
