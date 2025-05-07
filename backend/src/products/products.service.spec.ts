// products.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, DeleteResult } from 'typeorm';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
// Import CartItem and related types (adjust the path as needed)
// Update the path below to the correct relative location of cart-item.entity.ts
import { CartItem } from '../cart/entities/cart-item.entity';
import { CartService } from '../cart/cart.service';
import { InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
// Import CreateCartItemDto and UpdateCartItemDto (adjust the path as needed)
import { CreateCartItemDto } from '../cart/dto/create-cart-item.dto';
import { UpdateCartItemDto } from '../cart/dto/update-cart-item.dto';

// --- Mock Data (incorporating nested structures) ---

const mockUserId = 'user-test-555';
const mockProductId1 = 201;
const mockProductId2 = 202;
const mockStoreId1 = 'store-xzy-789'; // Ensure this matches the type in Product/Store entity (string)
const mockStoreId2 = 'store-abc-123';

// --- Mock Store Structure ---
// Define a simplified mock Store structure based on your example
interface MockStore {
    storeId: string;
    userId: string; // Assuming store belongs to a user
    storeName: string;
    standardPrice?: number;
    standardTime?: string;
    expressPrice?: number;
    expressTime?: string;
    // Other relevant store properties
}

// Example mock store instances
const mockStore1: MockStore = {
    storeId: mockStoreId1,
    userId: 'user-seller-abc',
    storeName: 'Gadget Hub',
    standardPrice: 10.0,
    expressPrice: 20.0,
    standardTime: "48 hours",
    expressTime: "24 hours",
};
const mockStore2: MockStore = {
    storeId: mockStoreId2,
    userId: 'user-seller-def',
    storeName: 'Clothing Corner',
    standardPrice: 5.0,
    expressPrice: 15.0,
    standardTime: "72 hours",
    expressTime: "36 hours",
};

// --- Mock Product Structure (including nested store) ---
// Use the actual Product type for better compatibility if possible,
// or define a detailed mock interface if Product has complex relations.
const mockProduct1: Product = {
    prodId: mockProductId1,
    name: 'Super Gadget',
    price: 149.99,
    productquantity: 50, // Available stock
    description: 'The latest super gadget.',
    imageUrl: 'super_gadget.jpg',
    category: 'Electronics', // Match field used in service if different ('productCategory'?)
    isActive: true,
    userId: mockStore1.userId, // Added userId to satisfy Product type

    // Direct properties likely accessed by CartService
    storeName: mockStore1.storeName,
    storeId: mockStore1.storeId,
    // Include the nested object if the entity relationship exists
    store: mockStore1 as any, // Cast as any if MockStore doesn't perfectly match Store entity type
    // Add other properties from your actual Product entity
    // userId: 'some-user-id', // Unlikely on product, usually via store
};
const mockProduct2: Product = {
    prodId: mockProductId2,
    name: 'Comfy T-Shirt',
    price: 25.00,
    productquantity: 100,
    description: 'A very comfortable t-shirt.',
    imageUrl: 'tshirt.jpg',
    category: 'Clothing',
    isActive: true,
    userId: mockStore2.userId, // Added userId to satisfy Product type
  
    storeName: mockStore2.storeName,
    storeId: mockStore2.storeId,
    store: mockStore2 as any,
    
};


// --- Mock CartItem Structure ---
const mockCartItem1: CartItem = {
    cartID: 10,
    userId: mockUserId,
    productId: mockProductId1,
    quantity: 2,
  
    // Relations likely null/undefined unless eagerly loaded
    // user: null,
    // product: null,
};

const mockCartItem2: CartItem = {
    cartID: 11,
    userId: mockUserId,
    productId: mockProductId2,
    quantity: 1,
 
};

// --- CartItemWithProductDetails Interface ---
interface CartItemWithProductDetails {
    cartID: number;
    userId: string;
    productId: number;
    quantity: number;
    productName: string;
    productPrice: number;
    imageUrl: string;
    availableQuantity: number;
    storeName: string;
    storeId: string;
}

// --- Expected Output Structure for getCart (Flattened) ---
const mockCartItemWithDetails1: CartItemWithProductDetails = {
    cartID: mockCartItem1.cartID,
    userId: mockCartItem1.userId,
    productId: mockCartItem1.productId,
    quantity: mockCartItem1.quantity,
    productName: mockProduct1.name,
    productPrice: mockProduct1.price,
    imageUrl: mockProduct1.imageUrl,
    availableQuantity: mockProduct1.productquantity,
    storeName: mockProduct1.storeName, // From Product's direct property
    storeId: mockProduct1.storeId,     // From Product's direct property
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
import { ObjectLiteral } from 'typeorm';

type MockRepository<T extends ObjectLiteral = any> = Partial<Record<keyof Repository<T>, jest.Mock>> & {
  manager?: {
    transaction: jest.Mock<any, any>;
  };
};

const createMockRepository = <T extends ObjectLiteral = any>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findByIds: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),

});

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
          useValue: createMockRepository<Product>(), // Use the mock factory
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    cartRepository = module.get(getRepositoryToken(CartItem));
    productRepository = module.get(getRepositoryToken(Product));

    // Reset mocks before each test
    jest.clearAllMocks();

    // Ensure cartRepository.manager is always defined and has a transaction method
    if (!cartRepository.manager || typeof cartRepository.manager.transaction !== 'function') {
        cartRepository.manager = { transaction: jest.fn() } as any;
    }
    // Mock the transaction implementation to call callback with mockEntityManager
    (cartRepository.manager!.transaction as jest.Mock).mockImplementation(async (callback) => {
        // Reset transactional mocks before each transaction runs in a test
        Object.values(mockEntityManager).forEach(mockFn => mockFn.mockClear());
        return await callback(mockEntityManager);
    });

  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- getCart Tests ---
  describe('getCart', () => {
    it('should retrieve cart items and map them to details using complex product mocks', async () => {
      // Arrange: Mock repos return respective mocks
      cartRepository.find?.mockResolvedValue([mockCartItem1, mockCartItem2]);
      // findByIds returns the full mock Product objects
      productRepository.findByIds?.mockResolvedValue([mockProduct1, mockProduct2]);

      // Act
      const result = await service.getCart(mockUserId);

      // Assert: Check calls
      expect(cartRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { cartID: 'ASC' }
      });
      expect(productRepository.findByIds).toHaveBeenCalledWith([mockProductId1, mockProductId2]);
      // Assert: Check result matches the *flattened* structure expected by the interface
      expect(result).toEqual([mockCartItemWithDetails1, mockCartItemWithDetails2]);
      // Optionally check specific derived fields
      expect(result[0].productName).toBe(mockProduct1.name);
      expect(result[0].storeName).toBe(mockProduct1.storeName);
       expect(result[1].availableQuantity).toBe(mockProduct2.productquantity);
       expect(result[1].storeId).toBe(mockProduct2.storeId);
    });

    // ... (other getCart tests: empty cart, product not found, errors - remain similar) ...
     it('should return an empty array if no cart items found', async () => {
        cartRepository.find?.mockResolvedValue([]);
        const result = await service.getCart(mockUserId);
        expect(productRepository.findByIds).not.toHaveBeenCalled();
        expect(result).toEqual([]);
      });

     it('should exclude items if their corresponding product is not found', async () => {
        cartRepository.find?.mockResolvedValue([mockCartItem1, mockCartItem2]);
        productRepository.findByIds?.mockResolvedValue([mockProduct1]); // Product 2 missing

        const result = await service.getCart(mockUserId);
        expect(result).toEqual([mockCartItemWithDetails1]); // Only item 1 included
      });

     it('should throw InternalServerErrorException if cartRepository.find fails', async () => {
        cartRepository.find?.mockRejectedValue(new Error('DB Find Error'));
        await expect(service.getCart(mockUserId)).rejects.toThrow(InternalServerErrorException);
      });

     it('should throw InternalServerErrorException if productRepository.findByIds fails', async () => {
        cartRepository.find?.mockResolvedValue([mockCartItem1]);
        productRepository.findByIds?.mockRejectedValue(new Error('DB FindByIds Error'));
        await expect(service.getCart(mockUserId)).rejects.toThrow(InternalServerErrorException);
      });
  });

  // --- addToCart Tests ---
  describe('addToCart', () => {
    const dto: CreateCartItemDto = { productId: mockProductId1, quantity: 1 };

    it('should add a new item using details from the complex product mock', async () => {
      const newItem = { ...mockCartItem1, quantity: dto.quantity };
      // findOne returns the full mock Product object
      productRepository.findOne?.mockResolvedValue(mockProduct1);
      cartRepository.findOne?.mockResolvedValue(null);
      cartRepository.create?.mockReturnValue(newItem);
      cartRepository.save?.mockResolvedValue(newItem);

      const result = await service.addToCart(mockUserId, dto);

      expect(productRepository.findOne).toHaveBeenCalledWith({ where: { prodId: dto.productId } });
      // Ensure service logic works with fields from mockProduct1 (e.g., productquantity, name)
      expect(cartRepository.save).toHaveBeenCalledWith(newItem);
      expect(result).toEqual(newItem);
    });

    it('should update quantity using details from the complex product mock', async () => {
        const existingItem = { ...mockCartItem1 }; // quantity: 2
        const updatedItem = { ...existingItem, quantity: existingItem.quantity + dto.quantity }; // quantity: 3
        // Ensure the mock product returned has enough stock defined
        const productWithStock = { ...mockProduct1, productquantity: 10 };

        productRepository.findOne?.mockResolvedValue(productWithStock);
        cartRepository.findOne?.mockResolvedValue(existingItem);
        cartRepository.save?.mockResolvedValue(updatedItem);

        await service.addToCart(mockUserId, dto);

        expect(productRepository.findOne).toHaveBeenCalledWith({ where: { prodId: dto.productId } });
        // Ensure stock check uses productquantity from productWithStock
        expect(cartRepository.save).toHaveBeenCalledWith(expect.objectContaining({ quantity: 3 }));
    });

    // ... (other addToCart tests: product not found, stock errors - remain similar, ensure findOne returns complex mock or null) ...
    it('should throw NotFoundException if product not found', async () => {
      productRepository.findOne?.mockResolvedValue(null);
      await expect(service.addToCart(mockUserId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if product is out of stock (stock = 0)', async () => {
      const productOutOfStock = { ...mockProduct1, productquantity: 0 };
      productRepository.findOne?.mockResolvedValue(productOutOfStock);
      await expect(service.addToCart(mockUserId, dto)).rejects.toThrow(BadRequestException);
      await expect(service.addToCart(mockUserId, dto)).rejects.toThrow(`Product "${productOutOfStock.name}" is out of stock.`);
    });

    it('should throw BadRequestException if adding new item exceeds stock', async () => {
      const productLowStock = { ...mockProduct1, productquantity: 2 };
      const addDto: CreateCartItemDto = { productId: mockProductId1, quantity: 3 };
      productRepository.findOne?.mockResolvedValue(productLowStock);
      cartRepository.findOne?.mockResolvedValue(null);

      await expect(service.addToCart(mockUserId, addDto)).rejects.toThrow(BadRequestException);
      await expect(service.addToCart(mockUserId, addDto)).rejects.toThrow(`Cannot add ${addDto.quantity} items. Only ${productLowStock.productquantity} available for "${productLowStock.name}".`);
    });

    it('should throw BadRequestException if updating existing item exceeds stock', async () => {
        const existingItem = { ...mockCartItem1, quantity: 3 }; // Already has 3
        const productStock = { ...mockProduct1, productquantity: 4 }; // Only 4 total available
        const addDto: CreateCartItemDto = { productId: mockProductId1, quantity: 2 }; // Trying to add 2 more

        productRepository.findOne?.mockResolvedValue(productStock);
        cartRepository.findOne?.mockResolvedValue(existingItem);

        await expect(service.addToCart(mockUserId, addDto)).rejects.toThrow(BadRequestException);
        await expect(service.addToCart(mockUserId, addDto)).rejects.toThrow(`Cannot add ${addDto.quantity} more items. Only ${productStock.productquantity - existingItem.quantity} left in stock for "${productStock.name}". Total available: ${productStock.productquantity}.`);
      });
  });

  // --- updateCartItem Tests ---
   describe('updateCartItem', () => {
        const productId = mockProductId1;
        const dto: UpdateCartItemDto = { quantity: 3 };

        it('should update item quantity using complex product mock for stock check', async () => {
            const existingItem = { ...mockCartItem1, quantity: 1 };
            const productWithStock = { ...mockProduct1, productquantity: 5 }; // Use complex mock
            const updatedItem = { ...existingItem, quantity: dto.quantity };

            cartRepository.findOne?.mockResolvedValue(existingItem);
            // Ensure findOne returns the complex mock
            productRepository.findOne?.mockResolvedValue(productWithStock);
            cartRepository.save?.mockResolvedValue(updatedItem);

            const result = await service.updateCartItem(mockUserId, productId, dto);

            expect(productRepository.findOne).toHaveBeenCalledWith({ where: { prodId: productId } });
             // Ensure stock check uses productquantity from productWithStock
            expect(cartRepository.save).toHaveBeenCalledWith(expect.objectContaining({ quantity: dto.quantity }));
            expect(result).toEqual(updatedItem);
        });

        // ... (other updateCartItem tests: quantity<=0, item not found, product not found, stock errors - remain similar) ...
        it('should throw BadRequestException if quantity is zero or less', async () => {
            const invalidDto: UpdateCartItemDto = { quantity: 0 };
            await expect(service.updateCartItem(mockUserId, productId, invalidDto)).rejects.toThrow(BadRequestException);
            expect(cartRepository.findOne).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException if cart item not found', async () => {
            cartRepository.findOne?.mockResolvedValue(null);
            await expect(service.updateCartItem(mockUserId, productId, dto)).rejects.toThrow(NotFoundException);
            expect(productRepository.findOne).not.toHaveBeenCalled();
        });

         it('should throw NotFoundException if product not found', async () => {
            cartRepository.findOne?.mockResolvedValue(mockCartItem1);
            productRepository.findOne?.mockResolvedValue(null); // Product deleted
            await expect(service.updateCartItem(mockUserId, productId, dto)).rejects.toThrow(NotFoundException);
            expect(cartRepository.save).not.toHaveBeenCalled();
         });

         it('should throw BadRequestException if requested quantity exceeds stock (using complex mock)', async () => {
            const productLowStock = { ...mockProduct1, productquantity: 2 }; // Stock is 2
            const highQuantityDto: UpdateCartItemDto = { quantity: 3 }; // Requesting 3
            cartRepository.findOne?.mockResolvedValue(mockCartItem1);
            productRepository.findOne?.mockResolvedValue(productLowStock); // Return complex mock

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

    it('should sync cart using complex product mocks from findByIds', async () => {
        // Arrange: findByIds returns the complex mocks
        mockEntityManager.findByIds.mockResolvedValue([mockProduct1, mockProduct2]);
        mockEntityManager.create
            .mockReturnValueOnce({ userId: mockUserId, productId: mockProductId1, quantity: 3 })
            .mockReturnValueOnce({ userId: mockUserId, productId: mockProductId2, quantity: 1 });
        mockEntityManager.save.mockResolvedValue(undefined);

        // Act
        await service.syncCart(mockUserId, itemsToSync);

        // Assert: Check transaction flow
        expect(cartRepository.manager!.transaction).toHaveBeenCalledTimes(1);
        expect(mockEntityManager.delete).toHaveBeenCalledWith(CartItem, { userId: mockUserId });
        expect(mockEntityManager.findByIds).toHaveBeenCalledWith(Product, [mockProductId1, mockProductId2]);
        // Ensure stock checks inside map use productquantity from mockProduct1/mockProduct2
        expect(mockEntityManager.create).toHaveBeenCalledTimes(2);
        expect(mockEntityManager.save).toHaveBeenCalledTimes(1);
    });

     it('should adjust quantity based on stock from complex product mock', async () => {
        const productLowStock = { ...mockProduct2, productquantity: 2 }; // Only 2 available
        const syncItemsLowStock: CreateCartItemDto[] = [
            { productId: mockProductId1, quantity: 1 }, // OK
            { productId: mockProductId2, quantity: 5 }, // Request 5, only 2 available
        ];
        // Arrange: findByIds returns complex mocks, one with low stock
        mockEntityManager.findByIds.mockResolvedValue([mockProduct1, productLowStock]);
        mockEntityManager.create
            .mockReturnValueOnce({ userId: mockUserId, productId: mockProductId1, quantity: 1 })
            .mockReturnValueOnce({ userId: mockUserId, productId: mockProductId2, quantity: 2 }); // Adjusted quantity
         mockEntityManager.save.mockResolvedValue(undefined);

         // Act
         await service.syncCart(mockUserId, syncItemsLowStock);

         // Assert: Check create was called with adjusted quantity
         expect(mockEntityManager.create).toHaveBeenCalledWith(CartItem, { userId: mockUserId, productId: mockProductId2, quantity: 2 });
         expect(mockEntityManager.save).toHaveBeenCalledTimes(1);
    });

    // ... (other syncCart tests: empty array, product not found, errors - remain similar, ensure findByIds returns complex mocks) ...
    it('should handle empty items array', async () => {
        await service.syncCart(mockUserId, []);
        expect(mockEntityManager.delete).toHaveBeenCalledWith(CartItem, { userId: mockUserId });
        expect(mockEntityManager.findByIds).not.toHaveBeenCalled();
        expect(mockEntityManager.save).not.toHaveBeenCalled();
     });

    it('should throw NotFoundException if any product ID is not found', async () => {
        mockEntityManager.findByIds.mockResolvedValue([mockProduct1]); // Product 2 missing
        await expect(service.syncCart(mockUserId, itemsToSync)).rejects.toThrow(NotFoundException);
        expect(mockEntityManager.save).not.toHaveBeenCalled();
     });

    it('should throw InternalServerErrorException if findByIds fails', async () => {
        mockEntityManager.findByIds.mockRejectedValue(new Error('DB Error'));
        await expect(service.syncCart(mockUserId, itemsToSync)).rejects.toThrow(InternalServerErrorException);
     });

    it('should throw InternalServerErrorException if save fails', async () => {
        mockEntityManager.findByIds.mockResolvedValue([mockProduct1, mockProduct2]);
        mockEntityManager.create.mockReturnValue({ }); // Dummy create
        mockEntityManager.save.mockRejectedValue(new Error('DB Save Error'));
        await expect(service.syncCart(mockUserId, itemsToSync)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // --- removeFromCart / clearCart Tests (Unaffected by Product structure) ---
  describe('removeFromCart', () => {
    const productId = mockProductId1;
    it('should return true if delete is successful', async () => {
      cartRepository.delete?.mockResolvedValue({ affected: 1 } as DeleteResult);
      const result = await service.removeFromCart(mockUserId, productId);
      expect(cartRepository.delete).toHaveBeenCalledWith({ userId: mockUserId, productId: productId });
      expect(result).toBe(true);
    });
     it('should return false if item not found', async () => {
      cartRepository.delete?.mockResolvedValue({ affected: 0 } as DeleteResult);
      const result = await service.removeFromCart(mockUserId, productId);
      expect(result).toBe(false);
    });
  });

   describe('clearCart', () => {
        it('should return true if delete is successful', async () => {
          cartRepository.delete?.mockResolvedValue({ affected: 3 } as DeleteResult);
          const result = await service.clearCart(mockUserId);
          expect(cartRepository.delete).toHaveBeenCalledWith({ userId: mockUserId });
          expect(result).toBe(true);
        });
        it('should return false if cart was empty', async () => {
          cartRepository.delete?.mockResolvedValue({ affected: 0 } as DeleteResult);
          const result = await service.clearCart(mockUserId);
          expect(result).toBe(false);
        });
      });

});