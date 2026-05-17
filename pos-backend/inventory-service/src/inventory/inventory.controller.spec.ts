import { NotFoundException } from '@nestjs/common';
import { InventoryController } from './inventory.controller';

describe('InventoryController stock decrement logic', () => {
  let controller: InventoryController;
  let supabaseService: { getClient: jest.Mock };
  let rabbitMQService: { publishStockLow: jest.Mock };

  const mockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const mockProductFetchAndUpdate = (product: any, updatedProduct: any) => {
    const singleFetch = jest.fn().mockResolvedValue({ data: product, error: null });
    const singleUpdate = jest.fn().mockResolvedValue({ data: updatedProduct, error: null });
    const update = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ single: singleUpdate }),
      }),
    });

    const client = {
      from: jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({ single: singleFetch }),
          }),
        })
        .mockReturnValueOnce({ update }),
      update,
    };

    supabaseService.getClient.mockReturnValue(client);
    return client;
  };

  beforeEach(() => {
    supabaseService = { getClient: jest.fn() };
    rabbitMQService = { publishStockLow: jest.fn() };
    controller = new InventoryController(supabaseService as any, rabbitMQService as any);
    delete process.env.PACT_TEST_MODE;
  });

  it('decrements product stock by the requested quantity', async () => {
    mockProductFetchAndUpdate(
      { id: 1, name: 'Milk Tea', stock: 20, low_stock_threshold: 5 },
      { id: 1, stock: 15 },
    );
    const res = mockResponse();

    await controller.decrementStock('1', { quantity: 5 }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, newStock: 15 });
    expect(rabbitMQService.publishStockLow).not.toHaveBeenCalled();
  });

  it('does not allow stock to go below zero', async () => {
    const client = mockProductFetchAndUpdate(
      { id: 1, name: 'Milk Tea', stock: 3, low_stock_threshold: 0 },
      { id: 1, stock: 0 },
    );
    const res = mockResponse();

    await controller.decrementStock('1', { quantity: 10 }, res);

    expect((client as any).update).toHaveBeenCalledWith({ stock: 0 });
    expect(res.json).toHaveBeenCalledWith({ success: true, newStock: 0 });
  });

  it('emits stock.low when new stock is equal to or below threshold', async () => {
    const product = { id: 1, name: 'Milk Tea', stock: 8, low_stock_threshold: 5 };
    mockProductFetchAndUpdate(product, { id: 1, stock: 5 });
    const res = mockResponse();

    await controller.decrementStock('1', { quantity: 3 }, res);

    expect(rabbitMQService.publishStockLow).toHaveBeenCalledWith(product, 5);
  });

  it('throws NotFoundException when product does not exist', async () => {
    const client = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      }),
    };
    supabaseService.getClient.mockReturnValue(client);
    const res = mockResponse();

    await expect(controller.decrementStock('404', { quantity: 1 }, res)).rejects.toBeInstanceOf(NotFoundException);
  });
});
