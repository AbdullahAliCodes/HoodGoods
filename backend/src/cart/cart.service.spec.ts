// cart.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, EntityManager, DeleteResult, ObjectLiteral } from 'typeorm';
import { CartService, CartItemWithProductDetails } from './cart.service';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';

// --- Mock Data ---
const mockUserId = 'user-test-123';
const mockProductId1 = 101;
const mockProductId2 = 102;
const mockStoreId1 = 'store-a';
const mockStoreId2 = 'store-b';

const mockCartItem1: CartItem = {
    cartID: 1,
    userId: mockUserId,
    productId: mockProductId1,
    quantity: 2,
   
    // Add relations if needed by entity definition, e.g., user: null, product: null
};

const mockCartItem2: CartItem = {
    cartID: 2,
    userId: mockUserId,
    productId: mockProductId2,
    quantity: 1,
   
};

const mockProduct1: Product = {
    isActive: true,
    userId: mockUserId,
    store: {
        storeId: mockStoreId1,  
        userId: mockUserId,
storeName: 'Store A',
standardPrice: 9.99,
standardTime: "24 hours",    
expressPrice: 19.99,
expressTime: "12 hours",
products: [],
user: {
    userID: "342",
    role: "seller"
},
      
     
    },
    prodId: mockProductId1, 
    name: 'Test Product 2',
    price: 9.99,
    productquantity: 10, // Available stock
    description: 'Desc 1',
    imageUrl: 'img1.jpg',
    storeName: 'Store A',
    storeId: mockStoreId1,
    category: "Other",

};

const mockProduct2: Product = {
    isActive: true,
    userId: mockUserId,
    store: {
        storeId: mockStoreId1,  
        userId: mockUserId,
storeName: 'Store A',
standardPrice: 5.00,
standardTime: "24 hours",    
expressPrice: 19.99,
expressTime: "12 hours",
products: [],
user: {
    userID: "342",
    role: "seller"
},
      
     
    },
    prodId: mockProductId2, 
    name: 'Test Product 1',
    price: 9.99,
    productquantity: 5, // Available stock
    description: 'Desc 2',
    imageUrl: 'img1.jpg',
    storeName: 'Store B',
    storeId: mockStoreId1,
    category: "Other",

};



const mockCartItemWithDetails1: CartItemWithProductDetails = {
    cartID: mockCartItem1.cartID,
    userId: mockCartItem1.userId,
    productId: mockCartItem1.productId,
    quantity: mockCartItem1.quantity,
    productName: mockProduct1.name,
    productPrice: mockProduct1.price,
    imageUrl: mockProduct1.imageUrl,
    availableQuantity: mockProduct1.productquantity,
    storeName: mockProduct1.storeName,
    storeId: mockProduct1.storeId,
};

const mockCartItemWithDetails2: CartItemWithProductDetails = {
    cartID: mockCartItem2.cartID,
    userId: mockCartItem2.userId,
    productId: mockCartItem2.productId,
    quantity: mockCartItem2.quantity,
    productName: mockProduct2.name,
    productPrice: mockProduct2.price,
    imageUrl: mockProduct2.imageUrl,
    availableQuantity: mockProduct2.productquantity,
    storeName: mockProduct2.storeName,
    storeId: mockProduct2.storeId,
};

// --- TypeORM Mock Factory ---
// Define a type for our mock repository methods
type MockRepository<T extends ObjectLiteral = any> = {
  find: jest.Mock;
  findOne: jest.Mock;
  findByIds: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
  findBy: jest.Mock;
  manager: jest.Mock & { transaction: jest.Mock };
};

const createMockRepository = <T extends ObjectLiteral = any>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findByIds: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  findBy: jest.fn(),
  manager: Object.assign(jest.fn(), {
    transaction: jest.fn(),
  }),
}) as MockRepository<T>;

// Mock EntityManager for transactions
const mockEntityManager = {
    delete: jest.fn(),
    findByIds: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
};


// --- Test Suite ---
describe('CartService', () => {
  let service: CartService;
  let cartRepository: MockRepository<CartItem>;
  let productRepository: MockRepository<Product>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: getRepositoryToken(CartItem),
          useValue: createMockRepository<CartItem>(),
        },
        {
          provide: getRepositoryToken(Product),
          useValue: createMockRepository<Product>(),
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    cartRepository = module.get(getRepositoryToken(CartItem));
    productRepository = module.get(getRepositoryToken(Product));

    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock the transaction implementation
    // It should immediately call the callback with the mockEntityManager
    cartRepository.manager.transaction.mockImplementation(async (callback) => {
        return await callback(mockEntityManager);
    });

  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- getCart Tests ---
  describe('getCart', () => {
    it('should retrieve cart items and map them to details', async () => {
      cartRepository.find.mockResolvedValue([mockCartItem1, mockCartItem2]);
      productRepository.findByIds.mockResolvedValue([mockProduct1, mockProduct2]);

      const result = await service.getCart(mockUserId);

      expect(cartRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { cartID: 'ASC' }
      });
      expect(productRepository.findByIds).toHaveBeenCalledWith([mockProductId1, mockProductId2]);
      expect(result).toEqual([mockCartItemWithDetails1, mockCartItemWithDetails2]);
    });

    it('should return an empty array if no cart items found', async () => {
      cartRepository.find.mockResolvedValue([]);

      const result = await service.getCart(mockUserId);

      expect(cartRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { cartID: 'ASC' }
      });
      expect(productRepository.findByIds).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

     it('should exclude items if their corresponding product is not found', async () => {
        // Cart has item1 and item2, but product repository only returns product1
        cartRepository.find.mockResolvedValue([mockCartItem1, mockCartItem2]);
        productRepository.findByIds.mockResolvedValue([mockProduct1]); // Product 2 missing

        const result = await service.getCart(mockUserId);

        expect(cartRepository.find).toHaveBeenCalledTimes(1);
        expect(productRepository.findByIds).toHaveBeenCalledWith([mockProductId1, mockProductId2]);
        // Only the item with the found product should be returned
        expect(result).toEqual([mockCartItemWithDetails1]);
      });

    it('should throw InternalServerErrorException if cartRepository.find fails', async () => {
      cartRepository.find.mockRejectedValue(new Error('DB Find Error'));

      await expect(service.getCart(mockUserId)).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException if productRepository.findByIds fails', async () => {
      cartRepository.find.mockResolvedValue([mockCartItem1]);
      productRepository.findByIds.mockRejectedValue(new Error('DB FindByIds Error'));

      await expect(service.getCart(mockUserId)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // --- addToCart Tests ---
  describe('addToCart', () => {
    const dto: CreateCartItemDto = { productId: mockProductId1, quantity: 1 };

    it('should add a new item if it does not exist', async () => {
      const newItem = { ...mockCartItem1, quantity: dto.quantity };
      productRepository.findOne.mockResolvedValue(mockProduct1); // Product exists and has stock
      cartRepository.findOne.mockResolvedValue(null); // Cart item doesn't exist
      cartRepository.create.mockReturnValue(newItem); // Mock creation
      cartRepository.save.mockResolvedValue(newItem); // Mock save

      const result = await service.addToCart(mockUserId, dto);

      expect(productRepository.findOne).toHaveBeenCalledWith({ where: { prodId: dto.productId } });
      expect(cartRepository.findOne).toHaveBeenCalledWith({ where: { userId: mockUserId, productId: dto.productId } });
      expect(cartRepository.create).toHaveBeenCalledWith({ userId: mockUserId, productId: dto.productId, quantity: dto.quantity });
      expect(cartRepository.save).toHaveBeenCalledWith(newItem);
      expect(result).toEqual(newItem);
    });

    it('should update quantity if item already exists', async () => {
      const existingItem = { ...mockCartItem1 }; // quantity: 2
      const updatedItem = { ...existingItem, quantity: existingItem.quantity + dto.quantity }; // quantity: 3
      const productWithEnoughStock = { ...mockProduct1, productquantity: 10 };

      productRepository.findOne.mockResolvedValue(productWithEnoughStock);
      cartRepository.findOne.mockResolvedValue(existingItem);
      cartRepository.save.mockResolvedValue(updatedItem);

      const result = await service.addToCart(mockUserId, dto);

      expect(productRepository.findOne).toHaveBeenCalledWith({ where: { prodId: dto.productId } });
      expect(cartRepository.findOne).toHaveBeenCalledWith({ where: { userId: mockUserId, productId: dto.productId } });
      expect(cartRepository.create).not.toHaveBeenCalled();
      // Check that save was called with the updated quantity
      expect(cartRepository.save).toHaveBeenCalledWith(expect.objectContaining({ quantity: existingItem.quantity + dto.quantity -1  }));
      expect(result).toEqual(updatedItem);
    });

    it('should throw NotFoundException if product not found', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.addToCart(mockUserId, dto)).rejects.toThrow(NotFoundException);
      expect(cartRepository.findOne).not.toHaveBeenCalled();
    });

     it('should throw BadRequestException if product stock is invalid (NaN)', async () => {
        const productInvalidStock = { ...mockProduct1, productquantity: NaN };
        productRepository.findOne.mockResolvedValue(productInvalidStock);

        await expect(service.addToCart(mockUserId, dto)).rejects.toThrow(BadRequestException);
        await expect(service.addToCart(mockUserId, dto)).rejects.toThrow(`Product with ID ${dto.productId} is currently unavailable (invalid stock).`);
      });

     it('should throw BadRequestException if product stock is invalid (< 0)', async () => {
        const productInvalidStock = { ...mockProduct1, productquantity: -1 };
        productRepository.findOne.mockResolvedValue(productInvalidStock);

        await expect(service.addToCart(mockUserId, dto)).rejects.toThrow(BadRequestException);
         await expect(service.addToCart(mockUserId, dto)).rejects.toThrow(`Product with ID ${dto.productId} is currently unavailable (invalid stock).`);
      });


    it('should throw BadRequestException if product is out of stock (stock = 0)', async () => {
      const productOutOfStock = { ...mockProduct1, productquantity: 0 };
      productRepository.findOne.mockResolvedValue(productOutOfStock);

      await expect(service.addToCart(mockUserId, dto)).rejects.toThrow(BadRequestException);
      await expect(service.addToCart(mockUserId, dto)).rejects.toThrow(`Product "${productOutOfStock.name}" is out of stock.`);
    });

    it('should throw BadRequestException if adding new item exceeds stock', async () => {
      const productLowStock = { ...mockProduct1, productquantity: 2 }; // Only 2 available
      const addDto: CreateCartItemDto = { productId: mockProductId1, quantity: 3 }; // Trying to add 3
      productRepository.findOne.mockResolvedValue(productLowStock);
      cartRepository.findOne.mockResolvedValue(null); // Item does not exist yet

      await expect(service.addToCart(mockUserId, addDto)).rejects.toThrow(BadRequestException);
      await expect(service.addToCart(mockUserId, addDto)).rejects.toThrow(`Cannot add ${addDto.quantity} items. Only ${productLowStock.productquantity} available for "${productLowStock.name}".`);
    });

    it('should throw BadRequestException if updating existing item exceeds stock', async () => {
      const existingItem = { ...mockCartItem1, quantity: 3 }; // Already has 3
      const productStock = { ...mockProduct1, productquantity: 4 }; // Only 4 total available
      const addDto: CreateCartItemDto = { productId: mockProductId1, quantity: 2 }; // Trying to add 2 more

      productRepository.findOne.mockResolvedValue(productStock);
      cartRepository.findOne.mockResolvedValue(existingItem);

      await expect(service.addToCart(mockUserId, addDto)).rejects.toThrow(BadRequestException);
      await expect(service.addToCart(mockUserId, addDto)).rejects.toThrow(`Cannot add ${addDto.quantity} more items. Only ${productStock.productquantity - existingItem.quantity} left in stock for "${productStock.name}". Total available: ${productStock.productquantity}.`);
    });
  });

  // --- updateCartItem Tests ---
   describe('updateCartItem', () => {
        const productId = mockProductId1;
        const dto: UpdateCartItemDto = { quantity: 3 }; // Update to quantity 3

        it('should update item quantity successfully', async () => {
            const existingItem = { ...mockCartItem1, quantity: 1 };
            const productWithStock = { ...mockProduct1, productquantity: 5 };
            const updatedItem = { ...existingItem, quantity: dto.quantity };

            cartRepository.findOne.mockResolvedValue(existingItem);
            productRepository.findOne.mockResolvedValue(productWithStock);
            cartRepository.save.mockResolvedValue(updatedItem);

            const result = await service.updateCartItem(mockUserId, productId, dto);

            expect(cartRepository.findOne).toHaveBeenCalledWith({ where: { userId: mockUserId, productId: productId } });
            expect(productRepository.findOne).toHaveBeenCalledWith({ where: { prodId: productId } });
            expect(cartRepository.save).toHaveBeenCalledWith(expect.objectContaining({ quantity: dto.quantity }));
            expect(result).toEqual(updatedItem);
        });

        it('should throw BadRequestException if quantity is zero or less', async () => {
            const invalidDto: UpdateCartItemDto = { quantity: 0 };
            await expect(service.updateCartItem(mockUserId, productId, invalidDto)).rejects.toThrow(BadRequestException);
            await expect(service.updateCartItem(mockUserId, productId, invalidDto)).rejects.toThrow('Quantity must be greater than zero. Use remove endpoint to delete item.');
            expect(cartRepository.findOne).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException if cart item not found', async () => {
            cartRepository.findOne.mockResolvedValue(null);

            await expect(service.updateCartItem(mockUserId, productId, dto)).rejects.toThrow(NotFoundException);
             await expect(service.updateCartItem(mockUserId, productId, dto)).rejects.toThrow(`Cart item with product ID ${productId} not found for this user.`);
             expect(productRepository.findOne).not.toHaveBeenCalled();
        });

         it('should throw NotFoundException if product not found', async () => {
            cartRepository.findOne.mockResolvedValue(mockCartItem1);
            productRepository.findOne.mockResolvedValue(null); // Product deleted

            await expect(service.updateCartItem(mockUserId, productId, dto)).rejects.toThrow(NotFoundException);
            await expect(service.updateCartItem(mockUserId, productId, dto)).rejects.toThrow(`Product with ID ${productId} not found (might have been deleted).`);
            expect(cartRepository.save).not.toHaveBeenCalled();
         });

        it('should throw BadRequestException if product stock is invalid', async () => {
            const productInvalidStock = { ...mockProduct1, productquantity: NaN };
            cartRepository.findOne.mockResolvedValue(mockCartItem1);
            productRepository.findOne.mockResolvedValue(productInvalidStock);

            await expect(service.updateCartItem(mockUserId, productId, dto)).rejects.toThrow(BadRequestException);
            await expect(service.updateCartItem(mockUserId, productId, dto)).rejects.toThrow(`Product with ID ${productId} is currently unavailable (invalid stock).`);
         });

         it('should throw BadRequestException if requested quantity exceeds stock', async () => {
            const productLowStock = { ...mockProduct1, productquantity: 2 }; // Stock is 2
            const highQuantityDto: UpdateCartItemDto = { quantity: 3 }; // Requesting 3
            cartRepository.findOne.mockResolvedValue(mockCartItem1);
            productRepository.findOne.mockResolvedValue(productLowStock);

            await expect(service.updateCartItem(mockUserId, productId, highQuantityDto)).rejects.toThrow(BadRequestException);
            await expect(service.updateCartItem(mockUserId, productId, highQuantityDto)).rejects.toThrow(`Cannot set quantity to ${highQuantityDto.quantity}. Only ${productLowStock.productquantity} available for "${productLowStock.name}".`);
         });
    });

  // --- syncCart Tests ---
  describe('syncCart', () => {
    const itemsToSync: CreateCartItemDto[] = [
      { productId: mockProductId1, quantity: 3 },
      { productId: mockProductId2, quantity: 1 },
    ];

    it('should delete existing items and add new ones within a transaction', async () => {
        mockEntityManager.findByIds.mockResolvedValue([mockProduct1, mockProduct2]); // Both products found with enough stock
        mockEntityManager.create
            .mockReturnValueOnce({ userId: mockUserId, productId: mockProductId1, quantity: 3 })
            .mockReturnValueOnce({ userId: mockUserId, productId: mockProductId2, quantity: 1 });
        mockEntityManager.save.mockResolvedValue(undefined); // Simulate successful save

        await service.syncCart(mockUserId, itemsToSync);

        expect(cartRepository.manager.transaction).toHaveBeenCalledTimes(1);
        expect(mockEntityManager.delete).toHaveBeenCalledWith(CartItem, { userId: mockUserId });
        expect(mockEntityManager.findByIds).toHaveBeenCalledWith(Product, [mockProductId1, mockProductId2]);
        expect(mockEntityManager.create).toHaveBeenCalledTimes(2);
        expect(mockEntityManager.create).toHaveBeenCalledWith(CartItem, { userId: mockUserId, productId: mockProductId1, quantity: 3 });
        expect(mockEntityManager.create).toHaveBeenCalledWith(CartItem, { userId: mockUserId, productId: mockProductId2, quantity: 1 });
        expect(mockEntityManager.save).toHaveBeenCalledWith([
            { userId: mockUserId, productId: mockProductId1, quantity: 3 },
            { userId: mockUserId, productId: mockProductId2, quantity: 1 },
        ]);
    });

     it('should handle empty items array by just deleting existing items', async () => {
        await service.syncCart(mockUserId, []);

        expect(cartRepository.manager.transaction).toHaveBeenCalledTimes(1);
        expect(mockEntityManager.delete).toHaveBeenCalledWith(CartItem, { userId: mockUserId });
        expect(mockEntityManager.findByIds).not.toHaveBeenCalled();
        expect(mockEntityManager.create).not.toHaveBeenCalled();
        expect(mockEntityManager.save).not.toHaveBeenCalled();
     });

    it('should throw NotFoundException if any product ID is not found', async () => {
        mockEntityManager.findByIds.mockResolvedValue([mockProduct1]); // Product 2 missing

        await expect(service.syncCart(mockUserId, itemsToSync)).rejects.toThrow(NotFoundException);
        await expect(service.syncCart(mockUserId, itemsToSync)).rejects.toThrow(`Sync failed: Products not found with IDs: ${mockProductId2}.`);
        expect(cartRepository.manager.transaction).toHaveBeenCalledTimes(2); // Transaction started
        expect(mockEntityManager.delete).toHaveBeenCalledWith(CartItem, { userId: mockUserId });
        expect(mockEntityManager.findByIds).toHaveBeenCalledWith(Product, [mockProductId1, mockProductId2]);
        expect(mockEntityManager.create).not.toHaveBeenCalled(); // Should fail before creating
        expect(mockEntityManager.save).not.toHaveBeenCalled();
     });

    it('should adjust quantity down if requested quantity exceeds available stock', async () => {
        const productLowStock = { ...mockProduct2, productquantity: 2 }; // Only 2 available
        const syncItemsLowStock: CreateCartItemDto[] = [
            { productId: mockProductId1, quantity: 1 }, // OK
            { productId: mockProductId2, quantity: 5 }, // Request 5, only 2 available
        ];
        mockEntityManager.findByIds.mockResolvedValue([mockProduct1, productLowStock]);
        mockEntityManager.create
            .mockReturnValueOnce({ userId: mockUserId, productId: mockProductId1, quantity: 1 })
            .mockReturnValueOnce({ userId: mockUserId, productId: mockProductId2, quantity: 2 }); // Adjusted quantity
         mockEntityManager.save.mockResolvedValue(undefined);

         await service.syncCart(mockUserId, syncItemsLowStock);

         expect(mockEntityManager.create).toHaveBeenCalledTimes(2);
         expect(mockEntityManager.create).toHaveBeenCalledWith(CartItem, { userId: mockUserId, productId: mockProductId1, quantity: 1 });
         expect(mockEntityManager.create).toHaveBeenCalledWith(CartItem, { userId: mockUserId, productId: mockProductId2, quantity: 2 }); // Check adjusted quantity
         expect(mockEntityManager.save).toHaveBeenCalledTimes(1);
    });

     it('should skip items with quantity zero or less', async () => {
        const syncItemsZeroQuantity: CreateCartItemDto[] = [
            { productId: mockProductId1, quantity: 1 },
            { productId: mockProductId2, quantity: 0 }, // Quantity 0
        ];
        mockEntityManager.findByIds.mockResolvedValue([mockProduct1, mockProduct2]);
         mockEntityManager.create
            .mockReturnValueOnce({ userId: mockUserId, productId: mockProductId1, quantity: 1 }); // Only create item 1
        mockEntityManager.save.mockResolvedValue(undefined);

        await service.syncCart(mockUserId, syncItemsZeroQuantity);

        expect(mockEntityManager.create).toHaveBeenCalledTimes(1); // Only called once
        expect(mockEntityManager.create).toHaveBeenCalledWith(CartItem, { userId: mockUserId, productId: mockProductId1, quantity: 1 });
        expect(mockEntityManager.save).toHaveBeenCalledWith([{ userId: mockUserId, productId: mockProductId1, quantity: 1 }]); // Only save item 1
     });

    it('should throw BadRequestException if product has invalid stock during sync', async () => {
        const productInvalidStock = { ...mockProduct1, productquantity: NaN };
        mockEntityManager.findByIds.mockResolvedValue([productInvalidStock, mockProduct2]);

        await expect(service.syncCart(mockUserId, itemsToSync)).rejects.toThrow(BadRequestException);
         await expect(service.syncCart(mockUserId, itemsToSync)).rejects.toThrow(`Product ID ${mockProductId1} has invalid stock data during sync.`);
     });

    it('should throw InternalServerErrorException if findByIds fails in transaction', async () => {
        mockEntityManager.findByIds.mockRejectedValue(new Error('DB Error'));

        await expect(service.syncCart(mockUserId, itemsToSync)).rejects.toThrow(InternalServerErrorException);
        await expect(service.syncCart(mockUserId, itemsToSync)).rejects.toThrow('Failed to fetch product details during sync.');
     });

    it('should throw InternalServerErrorException if save fails in transaction', async () => {
        mockEntityManager.findByIds.mockResolvedValue([mockProduct1, mockProduct2]);
         mockEntityManager.create.mockReturnValue({}); // Simplified mock
        mockEntityManager.save.mockRejectedValue(new Error('DB Save Error'));

        await expect(service.syncCart(mockUserId, itemsToSync)).rejects.toThrow(InternalServerErrorException);
        await expect(service.syncCart(mockUserId, itemsToSync)).rejects.toThrow('Failed to save cart items during sync.');
    });

  });

  // --- removeFromCart Tests ---
  describe('removeFromCart', () => {
    const productId = mockProductId1;

    it('should return true if delete is successful (affected > 0)', async () => {
      cartRepository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);
      const result = await service.removeFromCart(mockUserId, productId);
      expect(cartRepository.delete).toHaveBeenCalledWith({ userId: mockUserId, productId: productId });
      expect(result).toBe(true);
    });

    it('should return false if item not found (affected = 0)', async () => {
      cartRepository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);
      const result = await service.removeFromCart(mockUserId, productId);
      expect(cartRepository.delete).toHaveBeenCalledWith({ userId: mockUserId, productId: productId });
      expect(result).toBe(false);
    });

     it('should return false if affected is null or undefined', async () => {
        cartRepository.delete.mockResolvedValue({ affected: null } as DeleteResult);
        let result = await service.removeFromCart(mockUserId, productId);
        expect(result).toBe(false);

        cartRepository.delete.mockResolvedValue({ affected: undefined } as DeleteResult);
        result = await service.removeFromCart(mockUserId, productId);
        expect(result).toBe(false);

        cartRepository.delete.mockResolvedValue({} as DeleteResult); // No affected property
        result = await service.removeFromCart(mockUserId, productId);
        expect(result).toBe(false);
     });

     it('should allow TypeORM errors to propagate (e.g., DB connection)', async () => {
        const dbError = new Error("DB Connection Error");
        cartRepository.delete.mockRejectedValue(dbError);
        await expect(service.removeFromCart(mockUserId, productId)).rejects.toThrow(dbError);
     });
  });

  // --- clearCart Tests ---
   describe('clearCart', () => {
        it('should return true if delete is successful (affected > 0)', async () => {
          cartRepository.delete.mockResolvedValue({ affected: 3 } as DeleteResult); // 3 items deleted
          const result = await service.clearCart(mockUserId);
          expect(cartRepository.delete).toHaveBeenCalledWith({ userId: mockUserId });
          expect(result).toBe(true);
        });

        it('should return false if cart was empty (affected = 0)', async () => {
          cartRepository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);
          const result = await service.clearCart(mockUserId);
          expect(cartRepository.delete).toHaveBeenCalledWith({ userId: mockUserId });
          expect(result).toBe(false);
        });

        it('should return false if affected is null or undefined', async () => {
            cartRepository.delete.mockResolvedValue({ affected: null } as DeleteResult);
            let result = await service.clearCart(mockUserId);
            expect(result).toBe(false);

            cartRepository.delete.mockResolvedValue({} as DeleteResult);
             result = await service.clearCart(mockUserId);
             expect(result).toBe(false);
        });

        it('should allow TypeORM errors to propagate', async () => {
            const dbError = new Error("DB Error during clear");
            cartRepository.delete.mockRejectedValue(dbError);
            await expect(service.clearCart(mockUserId)).rejects.toThrow(dbError);
        });
      });

});