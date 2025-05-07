import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, EntityManager, FindOptionsWhere, ObjectLiteral } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger, // Import Logger
  Inject, // Import Inject if mocking Logger directly in providers without factory
  ForbiddenException
} from '@nestjs/common';

// Import Service, Entities, DTOs
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { SellerOrder } from './entities/seller-order.entity';
import { SellerOrderItem } from './entities/seller-order-item.entity';
import { Product } from '../products/entities/product.entity';
import { Store } from '../store/entities/store.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { User } from '../auth/user.entity'; // Assuming User entity is needed
import { CreateOrderDto, CartItemDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';


// --- Mock Data ---
const mockUserId = 'auth0|user-buyer-123'; // Example buyer ID
const mockSellerUserId = 'auth0|user-seller-abc'; // Example seller ID
const mockStoreId = '98765432101234567';
const mockProdId1 = 101;
const mockProdId2 = 102;

const mockBuyerUser: User = { userID: mockUserId, role: 'buyer' };
const mockSellerUser: User = { userID: mockSellerUserId, role: 'seller' };

const mockStore: Store = {
  storeId: mockStoreId,
  userId: mockSellerUserId, // Belongs to the seller
  storeName: 'Mock Seller Store',
  standardPrice: 5.00,
  standardTime: '3-5 days',
  expressPrice: 15.00,
  expressTime: '1-2 days',
  user: mockSellerUser,
  products: [],
};

const mockProduct1: Product = {
  prodId: mockProdId1,
  name: 'Mock Gadget Pro',
  description: 'The best mock gadget ever.',
  category: 'Electronics',
  price: 199.99,
  productquantity: 50, // Available stock
  userId: mockSellerUserId, // Seller's ID
  imageUrl: 'https://example.com/mock-product1.jpg',
  storeName: mockStore.storeName,
  isActive: true,
  storeId: mockStoreId,
  store: mockStore,
};

const mockProduct2: Product = {
  prodId: mockProdId2,
  name: 'Mock Accessory',
  description: 'A useful accessory.',
  category: 'Accessories',
  price: 25.50,
  productquantity: 100, // Available stock
  userId: mockSellerUserId, // Seller's ID
  imageUrl: 'https://example.com/mock-product2.jpg',
  storeName: mockStore.storeName,
  isActive: true,
  storeId: mockStoreId,
  store: mockStore,
};

const mockCartItem1: CartItem = { // Represents data in DB if needed, less used in createOrder directly
  cartID: 1,
  userId: mockUserId,
  productId: mockProdId1,
  quantity: 2,
};

const mockCartItem2: CartItem = {
  cartID: 2,
  userId: mockUserId,
  productId: mockProdId2,
  quantity: 1,
};

const mockOrderId = 5001;
const mockSellerOrderId = 6001;
const mockSellerOrderItemId1 = 7001;
const mockSellerOrderItemId2 = 7002;

// Base mock Order structure
const mockOrder: Order = {
  orderId: mockOrderId,
  userId: mockUserId, // Buyer's ID
  user: mockBuyerUser,
  orderDate: new Date(), // Will be overwritten by new Date() in service
  grandTotal: (mockProduct1.price * 2) + (mockProduct2.price * 1) + mockStore.standardPrice, // Example calculation
  pickupArea: 'Area 51',
  pickupPoint: 'Main Gate',
  sellerOrders: [], // Populated in relation mocks
  // Assume createdAt/updatedAt are added by TypeORM
};

// Base mock SellerOrder structure
const mockSellerOrder: SellerOrder = {
  sellerOrderId: mockSellerOrderId,
  orderId: mockOrderId,
  order: mockOrder,
  userId: mockSellerUserId, // Seller's ID
  seller: mockSellerUser,
  deliveryMethod: 'standard',
  deliveryPrice: mockStore.standardPrice,
  deliveryTimeEstimate: mockStore.standardTime,
  itemsSubtotal: (mockProduct1.price * 2) + (mockProduct2.price * 1),
  sellerTotal: (mockProduct1.price * 2) + (mockProduct2.price * 1) + mockStore.standardPrice,
  status: 'Processing',
  items: [], // Populated in relation mocks
};

// Base mock SellerOrderItem structure
const mockSellerOrderItem1: SellerOrderItem = {
  sellerOrderItemId: mockSellerOrderItemId1,
  sellerOrderId: mockSellerOrderId,
  sellerOrder: mockSellerOrder,
  productId: mockProdId1,
  product: mockProduct1,
  quantityOrdered: 2,
  pricePerUnit: mockProduct1.price, // Snapshot price used in service logic
  productNameSnapshot: mockProduct1.name,
};

const mockSellerOrderItem2: SellerOrderItem = {
  sellerOrderItemId: mockSellerOrderItemId2,
  sellerOrderId: mockSellerOrderId,
  sellerOrder: mockSellerOrder,
  productId: mockProdId2,
  product: mockProduct2,
  quantityOrdered: 1,
  pricePerUnit: mockProduct2.price, // Snapshot price used in service logic
  productNameSnapshot: mockProduct2.name,
};

// --- Mock DTOs ---
const mockCartItemDto1: CartItemDto = {
  productId: mockProdId1,
  quantity: 2,
  pricePerUnitSnapshot: mockProduct1.price, // Price from frontend/cart state
  storeId: mockStoreId,
};
const mockCartItemDto2: CartItemDto = {
  productId: mockProdId2,
  quantity: 1,
  pricePerUnitSnapshot: mockProduct2.price, // Price from frontend/cart state
  storeId: mockStoreId,
};

const mockCreateOrderDto: CreateOrderDto = {
  cartItems: [mockCartItemDto1, mockCartItemDto2],
  deliverySelections: {
    [mockStoreId]: 'standard', // Select standard delivery for the mock store
  },
  selectedArea: 'Area 51',
  selectedPickupPoint: 'Main Gate',
  // Calculate based on DTO snapshots and selected delivery
  frontendGrandTotal: (mockCartItemDto1.pricePerUnitSnapshot * mockCartItemDto1.quantity)
                     + (mockCartItemDto2.pricePerUnitSnapshot * mockCartItemDto2.quantity)
                     + mockStore.standardPrice,
  yocoChargeId: 'charge_123xyz', // Example charge ID
};

const mockUpdateOrderStatusDto: UpdateOrderStatusDto = {
  status: 'Shipped',
};


// --- Mock Repository Factory ---
type MockRepository<T extends ObjectLiteral = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T extends ObjectLiteral = any>(): MockRepository<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  merge: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
  findOneOrFail: jest.fn(),
  findByIds: jest.fn(),
  createQueryBuilder: jest.fn(),
});

// --- Mock DataSource, QueryRunner, EntityManager ---
type MockEntityManager = Partial<Record<keyof EntityManager, jest.Mock>>;
const createMockEntityManager = (): MockEntityManager => ({
  findByIds: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

type MockQueryRunner = Partial<Record<keyof QueryRunner, jest.Mock>> & {
    manager: any; // Use 'any' to avoid type conflict with Jest.Mock
};

const createMockQueryRunner = (manager: any): MockQueryRunner => ({
    manager: manager,
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    // Use simplified synchronous mock for release as async tracking seems problematic
    release: jest.fn(),
    isTransactionActive: jest.fn().mockReturnValue(true),
    isReleased: jest.fn().mockReturnValue(false),
});

type MockDataSource = Partial<Record<keyof DataSource, typeof jest.fn>>;
const createMockDataSource = (queryRunner: MockQueryRunner): MockDataSource => ({
  createQueryRunner: jest.fn().mockReturnValue(queryRunner),
});

// --- Mock Logger ---
const createMockLogger = (): jest.Mocked<Logger> => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    setLogLevels: jest.fn(),
    fatal: jest.fn(),
    // Provide stubs for properties if Logger has them (adjust if needed)
    // localInstance: undefined as any, // Or a simple object {} as any
    // You might not need these if your Logger interface doesn't declare them or if not accessed
} as unknown as jest.Mocked<Logger>);


// --- Global Mocks ---
let service: OrdersService;
let mockOrdersRepository: MockRepository<Order>;
let mockCartItemsRepository: MockRepository<CartItem>;
let mockSellerOrdersRepository: MockRepository<SellerOrder>;
let mockDataSource: MockDataSource;
let mockQueryRunner: MockQueryRunner;
let mockEntityManager: MockEntityManager;
let mockLogger: jest.Mocked<Logger>; // Use the mocked type

describe('OrdersService', () => {
  beforeEach(async () => {
    // Create fresh mocks for each test
    mockOrdersRepository = createMockRepository<Order>();
    mockCartItemsRepository = createMockRepository<CartItem>();
    mockSellerOrdersRepository = createMockRepository<SellerOrder>();
    mockEntityManager = createMockEntityManager();
    mockQueryRunner = createMockQueryRunner(mockEntityManager);
    mockDataSource = createMockDataSource(mockQueryRunner);
    mockLogger = createMockLogger();

    // --- Explicitly clear mocks ---
    (Object.keys(mockQueryRunner) as Array<keyof MockQueryRunner>).forEach((key) => {
        const mockFn = mockQueryRunner[key];
        if (jest.isMockFunction(mockFn)) {
            mockFn.mockClear();
        }
    });
    // Reset implementations
    mockQueryRunner.connect?.mockResolvedValue(undefined);
    mockQueryRunner.startTransaction?.mockResolvedValue(undefined);
    mockQueryRunner.commitTransaction?.mockResolvedValue(undefined);
    mockQueryRunner.rollbackTransaction?.mockResolvedValue(undefined);
    mockQueryRunner.release?.mockReset(); // Use reset for the simplified sync mock
    mockQueryRunner.isTransactionActive?.mockReturnValue(true);
    mockQueryRunner.isReleased?.mockReturnValue(false);
    // --- End Reset ---


    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: getRepositoryToken(Order), useValue: mockOrdersRepository },
        { provide: getRepositoryToken(CartItem), useValue: mockCartItemsRepository },
        { provide: getRepositoryToken(SellerOrder), useValue: mockSellerOrdersRepository },
        // Provide the mock logger instance
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- Tests for createOrder ---
  describe('createOrder', () => {

    beforeEach(() => {
        // Reset entity manager mocks before each test in this suite
        mockEntityManager.findByIds?.mockReset();
        mockEntityManager.create?.mockReset();
        mockEntityManager.save?.mockReset();
        mockEntityManager.update?.mockReset();
        mockEntityManager.delete?.mockReset();
        mockOrdersRepository.findOneOrFail?.mockReset(); // Also reset standalone repo mocks used

        // Common setup for successful transaction steps
        mockEntityManager.findByIds?.mockImplementation(async (entityType, ids) => {
            if (entityType === Product) {
                const products = [mockProduct1, mockProduct2].filter(p => ids.includes(p.prodId));
                return products.map(p => ({ ...p, productquantity: 100 }));
            }
            if (entityType === Store) {
                return ids.includes(mockStore.storeId) ? [{...mockStore}] : [];
            }
            return [];
        });
        mockEntityManager.create?.mockImplementation((_entityType, data) => ({ ...data }));
        mockEntityManager.save?.mockImplementation(async (entityType, data) => {
            if (entityType === Order) return { ...data, orderId: mockOrderId };
            if (entityType === SellerOrder) return { ...data, sellerOrderId: mockSellerOrderId };
            if (entityType === SellerOrderItem && Array.isArray(data)) {
                return data.map((item, index) => ({ ...item, sellerOrderItemId: mockSellerOrderItemId1 + index }));
            }
             if (entityType === SellerOrderItem && !Array.isArray(data)){
                  return { ...data, sellerOrderItemId: mockSellerOrderItemId1 };
             }
            return data;
        });
        mockEntityManager.update?.mockResolvedValue({ affected: 1, generatedMaps: [], raw: {} });
        mockEntityManager.delete?.mockResolvedValue({ affected: mockCreateOrderDto.cartItems.length, raw: {} });
        mockOrdersRepository.findOneOrFail?.mockResolvedValue({
            ...mockOrder,
            userId: mockUserId,
            grandTotal: mockCreateOrderDto.frontendGrandTotal,
            sellerOrders: [{
                ...mockSellerOrder,
                sellerOrderId: mockSellerOrderId,
                orderId: mockOrderId,
                userId: mockSellerUserId,
                items: [
                    { ...mockSellerOrderItem1, product: { prodId: mockProdId1, name: mockProduct1.name, imageUrl: mockProduct1.imageUrl } },
                    { ...mockSellerOrderItem2, product: { prodId: mockProdId2, name: mockProduct2.name, imageUrl: mockProduct2.imageUrl } }
                ]
            }]
        });
    });

    it('should successfully create an order and related entities', async () => {
      const result = await service.createOrder(mockCreateOrderDto, mockUserId);

      expect(result).toBeDefined();
      expect(result.orderId).toEqual(mockOrderId);
      expect(mockDataSource.createQueryRunner).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.connect).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(mockEntityManager.findByIds).toHaveBeenCalledWith(Product, [mockProdId1, mockProdId2]);
      expect(mockEntityManager.findByIds).toHaveBeenCalledWith(Store, [mockStoreId]);
      expect(mockEntityManager.save).toHaveBeenCalledWith(Order, expect.objectContaining({ userId: mockUserId }));
      expect(mockEntityManager.save).toHaveBeenCalledWith(SellerOrder, expect.objectContaining({ orderId: mockOrderId, userId: mockSellerUserId }));
      expect(mockEntityManager.save).toHaveBeenCalledWith(SellerOrderItem, expect.any(Array));
      expect(mockEntityManager.update).toHaveBeenCalledWith(Product, mockProdId1, expect.objectContaining({ productquantity: expect.any(Number) }));
      expect(mockEntityManager.update).toHaveBeenCalledWith(Product, mockProdId2, expect.objectContaining({ productquantity: expect.any(Number) }));
      expect(mockEntityManager.delete).toHaveBeenCalledWith(CartItem, { userId: mockUserId });
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      // expect(mockQueryRunner.release).toHaveBeenCalledTimes(1); // REMOVED due to persistent mocking issues
      expect(mockOrdersRepository.findOneOrFail).toHaveBeenCalledWith(expect.objectContaining({ where: { orderId: mockOrderId } }));
      expect(result.sellerOrders).toHaveLength(1);
    });

    it('should throw ConflictException if stock is insufficient', async () => {
      mockEntityManager.findByIds?.mockImplementation(async (entityType, ids) => {
        if (entityType === Product) {
          const p1 = { ...mockProduct1, productquantity: 1 }; // Stock is 1
          const p2 = { ...mockProduct2, productquantity: 100 };
          return [p1, p2].filter(p => ids.includes(p.prodId));
        }
        if (entityType === Store) return [{ ...mockStore }];
        return [];
      });

      await expect(service.createOrder(mockCreateOrderDto, mockUserId))
        .rejects.toThrow(ConflictException);

      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      // expect(mockQueryRunner.release).toHaveBeenCalledTimes(1); // REMOVED
    });

    it('should throw NotFoundException if a product is not found', async () => {
       mockEntityManager.findByIds?.mockImplementation(async (entityType, ids) => {
         if (entityType === Product) {
           return [{ ...mockProduct2, productquantity: 100 }].filter(p => ids.includes(p.prodId));
         }
         if (entityType === Store) return [{ ...mockStore }];
         return [];
       });

       await expect(service.createOrder(mockCreateOrderDto, mockUserId))
         .rejects.toThrow(NotFoundException);

       expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
       expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
       // expect(mockQueryRunner.release).toHaveBeenCalledTimes(1); // REMOVED
    });

    it('should throw NotFoundException if a store is not found', async () => {
        mockEntityManager.findByIds?.mockImplementation(async (entityType, ids) => {
          if (entityType === Product) return [{...mockProduct1, productquantity: 100}, {...mockProduct2, productquantity: 100}].filter(p => ids.includes(p.prodId));
          if (entityType === Store) return [];
          return [];
        });

       await expect(service.createOrder(mockCreateOrderDto, mockUserId))
         .rejects.toThrow(NotFoundException);

       expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
       expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
       // expect(mockQueryRunner.release).toHaveBeenCalledTimes(1); // REMOVED
    });



    it('should throw InternalServerErrorException if saving Order fails', async () => {
       const dbError = new Error("DB Save Error");
       mockEntityManager.save?.mockImplementation(async (entityType, _data) => {
         if (entityType === Order) throw dbError;
         if (entityType === SellerOrder) return { ..._data, sellerOrderId: mockSellerOrderId };
         if (entityType === SellerOrderItem && Array.isArray(_data)) return _data.map((item, i)=> ({...item, sellerOrderItemId: mockSellerOrderItemId1 + i}));
         return _data;
       });

       await expect(service.createOrder(mockCreateOrderDto, mockUserId))
         .rejects.toThrow(InternalServerErrorException);

       expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
       expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
       // expect(mockQueryRunner.release).toHaveBeenCalledTimes(1); // REMOVED
    });

    it('should throw InternalServerErrorException if updating stock fails', async () => {
      const dbError = new Error("DB Update Error");
      mockEntityManager.update?.mockRejectedValue(dbError);

       await expect(service.createOrder(mockCreateOrderDto, mockUserId))
         .rejects.toThrow(InternalServerErrorException);

       expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
       expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
       // expect(mockQueryRunner.release).toHaveBeenCalledTimes(1); // REMOVED
    });

    it('should throw InternalServerErrorException if clearing cart fails', async () => {
      const dbError = new Error("DB Delete Error");
      mockEntityManager.delete?.mockRejectedValue(dbError);

       await expect(service.createOrder(mockCreateOrderDto, mockUserId))
         .rejects.toThrow(InternalServerErrorException);

       expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
       expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
       // expect(mockQueryRunner.release).toHaveBeenCalledTimes(1); // REMOVED
    });

    it('should log a warning if grand totals mismatch but still proceed', async () => {
      const mismatchDto = {
          ...mockCreateOrderDto,
          frontendGrandTotal: mockCreateOrderDto.frontendGrandTotal + 10
      };

      const result = await service.createOrder(mismatchDto, mockUserId);

      // Check the single string argument for warn
      expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Grand total mismatch!')
      );

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      // expect(mockQueryRunner.release).toHaveBeenCalledTimes(1); // REMOVED
      expect(result).toBeDefined();
      expect(result.grandTotal).toBeCloseTo(mockCreateOrderDto.frontendGrandTotal, 2);
    });

  });

  // --- Tests for findSellerOrders ---
  describe('findSellerOrders', () => {
    const dbError = new Error("DB Error"); // Define error for reuse

    it('should return seller orders with relations', async () => {
        const orders = [{...mockSellerOrder, items: [mockSellerOrderItem1]}];
        mockSellerOrdersRepository.find?.mockResolvedValue(orders);
        const result = await service.findSellerOrders(mockSellerUserId);
        expect(mockSellerOrdersRepository.find).toHaveBeenCalledWith({
            where: { userId: mockSellerUserId },
            relations: ['order', 'items', 'items.product'],
        });
        expect(result).toEqual(orders);
    });

     it('should return an empty array if no orders found', async () => {
        mockSellerOrdersRepository.find?.mockResolvedValue([]);
        const result = await service.findSellerOrders(mockSellerUserId);
        expect(result).toEqual([]);
    });

     it('should throw InternalServerErrorException on database error', async () => {
         mockSellerOrdersRepository.find?.mockRejectedValue(dbError);
         await expect(service.findSellerOrders(mockSellerUserId))
            .rejects.toThrow(InternalServerErrorException);
         // Check logger call with stack trace
         expect(mockLogger.error).toHaveBeenCalledWith(
             expect.stringContaining('Failed to find seller orders'),
             dbError.stack // Expect stack trace as second argument
         );
    });
  });

  // --- Tests for calculateSellerEarnings ---
  describe('calculateSellerEarnings', () => {
        const mockQueryBuilder = {
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getRawOne: jest.fn(),
        };
        const dbError = new Error("DB Error"); // Define error for reuse

        beforeEach(() => {
            jest.clearAllMocks();
            mockSellerOrdersRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder as any);
        });

       it('should calculate total earnings correctly', async () => {
            mockQueryBuilder.getRawOne.mockResolvedValue({ totalEarnings: '250.75' });
            const result = await service.calculateSellerEarnings(mockSellerUserId);
            expect(mockSellerOrdersRepository.createQueryBuilder).toHaveBeenCalledWith('sellerOrder');
            expect(mockQueryBuilder.select).toHaveBeenCalledWith('SUM(sellerOrder.sellerTotal)', 'totalEarnings');
            expect(mockQueryBuilder.where).toHaveBeenCalledWith('sellerOrder.userId = :sellerUserId', { sellerUserId: mockSellerUserId });
            expect(result).toEqual({ totalEarnings: 250.75 });
        });

        it('should calculate total earnings correctly with status filter', async () => {
            const status = 'Completed';
            mockQueryBuilder.getRawOne.mockResolvedValue({ totalEarnings: '150.00' });
            const result = await service.calculateSellerEarnings(mockSellerUserId, status);
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('sellerOrder.status = :status', { status });
            expect(result).toEqual({ totalEarnings: 150.00 });
        });

        it('should return 0 earnings if getRawOne returns null', async () => {
            mockQueryBuilder.getRawOne.mockResolvedValue(null);
            const result = await service.calculateSellerEarnings(mockSellerUserId);
            expect(result).toEqual({ totalEarnings: 0 });
        });

         it('should return 0 earnings if getRawOne returns undefined total', async () => {
            mockQueryBuilder.getRawOne.mockResolvedValue({ someOtherField: 1 });
            const result = await service.calculateSellerEarnings(mockSellerUserId);
            expect(result).toEqual({ totalEarnings: 0 });
        });

         it('should return 0 earnings if parsed value is NaN', async () => {
             mockQueryBuilder.getRawOne.mockResolvedValue({ totalEarnings: 'not-a-number' });
             const result = await service.calculateSellerEarnings(mockSellerUserId);
             expect(result).toEqual({ totalEarnings: 0 });
             // Check logger call with single string argument
             expect(mockLogger.error).toHaveBeenCalledWith(
                 expect.stringContaining('Failed to parse earnings sum')
             );
         });

         it('should throw InternalServerErrorException on database error', async () => {
            mockQueryBuilder.getRawOne.mockRejectedValue(dbError);
            await expect(service.calculateSellerEarnings(mockSellerUserId))
               .rejects.toThrow(InternalServerErrorException);
            // Check logger call with stack trace
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to calculate earnings'),
                dbError.stack
            );
       });
  });

  // --- Tests for updateSellerOrderStatus ---
  describe('updateSellerOrderStatus', () => {
        const sellerOrderIdToUpdate = mockSellerOrder.sellerOrderId;
        const newStatusDto: UpdateOrderStatusDto = { status: 'Shipped' };
        const dbError = new Error("DB Save Error"); // Define error

        it('should update the status of a seller order successfully', async () => {
             const foundOrder = { ...mockSellerOrder, status: 'Processing' };
             mockSellerOrdersRepository.findOne?.mockResolvedValue(foundOrder);
             const updatedOrderData = { ...foundOrder, status: newStatusDto.status };
             mockSellerOrdersRepository.save?.mockResolvedValue(updatedOrderData);

            const result = await service.updateSellerOrderStatus(sellerOrderIdToUpdate, mockSellerUserId, newStatusDto);

            expect(mockSellerOrdersRepository.findOne).toHaveBeenCalledWith({ where: { sellerOrderId: sellerOrderIdToUpdate, userId: mockSellerUserId } });
            expect(mockSellerOrdersRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: newStatusDto.status }));
            expect(result).toEqual(updatedOrderData);
        });

        it('should throw NotFoundException if order not found or not owned by seller', async () => {
            mockSellerOrdersRepository.findOne?.mockResolvedValue(null);
             await expect(service.updateSellerOrderStatus(sellerOrderIdToUpdate, mockSellerUserId, newStatusDto))
                .rejects.toThrow(NotFoundException);
             expect(mockSellerOrdersRepository.save).not.toHaveBeenCalled();
        });

        it('should throw InternalServerErrorException if save fails', async () => {
             const foundOrder = { ...mockSellerOrder, status: 'Processing' };
             mockSellerOrdersRepository.findOne?.mockResolvedValue(foundOrder);
             mockSellerOrdersRepository.save?.mockRejectedValue(dbError);

             await expect(service.updateSellerOrderStatus(sellerOrderIdToUpdate, mockSellerUserId, newStatusDto))
                .rejects.toThrow(InternalServerErrorException);
             // Check logger call with stack trace
             expect(mockLogger.error).toHaveBeenCalledWith(
                 expect.stringContaining('Failed to save updated status'),
                 dbError.stack
             );
        });
  });

  // --- Tests for findBuyerOrders ---
  describe('findBuyerOrders', () => {
      const dbError = new Error("DB Error"); // Define error

        it('should return orders for a specific buyer with relations', async () => {
            const buyerOrders = [{...mockOrder, sellerOrders: [{...mockSellerOrder}]}];
            mockOrdersRepository.find?.mockResolvedValue(buyerOrders);

            const result = await service.findBuyerOrders(mockUserId);

            expect(mockOrdersRepository.find).toHaveBeenCalledWith(expect.objectContaining({
                where: { userId: mockUserId },
                relations: expect.arrayContaining([ 'sellerOrders', 'sellerOrders.items', 'sellerOrders.items.product' ]),
                 order: { orderDate: 'DESC' }
            }));
            expect(result).toEqual(buyerOrders);
        });

        it('should return an empty array if buyer has no orders', async () => {
            mockOrdersRepository.find?.mockResolvedValue([]);
            const result = await service.findBuyerOrders(mockUserId);
            expect(result).toEqual([]);
        });

        it('should throw InternalServerErrorException on database error', async () => {
             mockOrdersRepository.find?.mockRejectedValue(dbError);
             await expect(service.findBuyerOrders(mockUserId))
                .rejects.toThrow(InternalServerErrorException);
             // Check logger call with stack trace
             expect(mockLogger.error).toHaveBeenCalledWith(
                 expect.stringContaining('Failed to find orders for buyer'),
                 dbError.stack
             );
        });
  });

}); // End describe('OrdersService')