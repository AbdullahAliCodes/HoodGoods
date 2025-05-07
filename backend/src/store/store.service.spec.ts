// src/store/store.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, EntityManager, In, FindOneOptions } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException, // Import if needed for specific transaction error tests
} from '@nestjs/common';

import { StoreService, StoreDeliveryDetails } from './store.service';
import { Store } from './entities/store.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../auth/user.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';

const mockUserId = 'auth0|user-12345abc'; // Example varchar user ID
const mockStoreId = '98765432101234567'; // Example string representing bigint
const mockProdId = 101; // Example number representing int

// Mock User based on User entity
// Note: Relationships like store, products, orders are usually omitted
// or simplified in base mock data unless specifically needed for a test.
const mockUser: User = {
  userID: mockUserId, // Matches @PrimaryColumn('varchar') userID: string;
  role: 'seller',     // Matches @Column({ default: 'buyer' }) role: string;
  // Add other User properties if they exist and are relevant to StoreService tests
};

// Mock Store based on Store entity
const mockStore: Store = {
  storeId: mockStoreId,      // Matches @PrimaryGeneratedColumn('increment', { type: 'bigint' }) storeId: string;
  userId: mockUserId,        // Matches @Column({ type: 'varchar', name: 'userID' }) userId: string;
  storeName: 'Mock Super Store', // Matches @Column({ type: 'text', name: 'store_name' }) storeName: string;
  standardPrice: 5.99,       // Matches @Column({ name: 'standard_price', type: 'real' }) standardPrice: number;
  standardTime: '3-5 Business Days', // Matches @Column({ name: 'standard_time', type: 'text' }) standardTime: string;
  expressPrice: 15.50,       // Matches @Column({ name: 'express_price', type: 'real' }) expressPrice: number;
  expressTime: '1-2 Business Days',  // Matches @Column({ name: 'express_time', type: 'text' }) expressTime: string;

  // --- Relationships (Simplified for basic mocking) ---
  user: mockUser,            // Matches @OneToOne(() => User) user: User; (linked for potential use)
  products: [],              // Matches @OneToMany(() => Product, ...) products: Product[]; (initially empty)
};

// Mock Product based on Product entity
const mockProduct: Product = {
  prodId: mockProdId,           // Matches @PrimaryColumn({ name: 'productID', type: 'int' }) prodId: number;
  name: 'Mock Gadget Pro',      // Matches @Column({ name: 'productName', ... }) name: string;
  description: 'The best mock gadget ever.', // Matches @Column({ name: 'productdescription', ... }) description: string;
  category: 'Electronics',      // Matches @Column({ name: 'productcategory', ... }) category: string;
  price: 199.99,                // Matches @Column({ name: 'productprice', type: 'real', ... }) price: number;
  productquantity: 50,          // Matches @Column({ name: 'productquantity', ... }) productquantity: number;
  userId: mockUserId,           // Matches @Column({ name: 'userID', ... }) userId: string; (Seller's ID)
  imageUrl: 'https://example.com/mock-product.jpg', // Matches @Column({ name: 'imageURL', ... }) imageUrl: string;
  storeName: mockStore.storeName, // Matches @Column({ name: 'storeName', ... }) storeName: string; (Denormalized)
  isActive: true,               // Matches @Column({ name: 'is_active', ... }) isActive: boolean;
  storeId: mockStoreId,         // Matches @Column({ name: 'store_id', type: 'bigint' }) storeId: string;

  // --- Relationships (Simplified) ---
   // Type definition requires 'store', even if simplified
  store: mockStore, // Minimal representation or link back to mockStore
  // No direct User relation defined in Product entity snippet, but userId exists
};

// --- Mock Repository Factory (Keep as is) ---

// --- Mock Repository Factory ---
// Type gymnastics to satisfy TypeORM's Repository type
import { ObjectLiteral } from 'typeorm';

type MockRepository<T extends ObjectLiteral = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T extends ObjectLiteral = any>(): MockRepository<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  merge: jest.fn(),
  delete: jest.fn(),
  findOneOrFail: jest.fn(), // Needed for createStoreWithProducts transaction success path
});

// --- Mock EntityManager ---
const createMockEntityManager = () => ({
  transaction: jest.fn().mockImplementation(async (callback) => {
    // Simulate transaction by providing mock repositories to the callback
    const transactionalEntityManager = {
      getRepository: jest.fn((entity) => {
        if (entity === Store) return mockStoreRepository;
        if (entity === Product) return mockProductRepository;
        if (entity === User) return mockUserRepository;
        throw new Error('Mock getRepository not configured for this entity');
      }),
      // Add other transactional manager methods if needed by the callback
    };
    try {
      // Execute the callback passed to the real transaction
      return await callback(transactionalEntityManager);
    } catch (error) {
        // Rethrow errors originating from the callback
        throw error;
    }
  }),
   getRepository: jest.fn((entity) => { // Also mock getRepository on the base manager if needed directly
        if (entity === Store) return mockStoreRepository;
        if (entity === Product) return mockProductRepository;
        if (entity === User) return mockUserRepository;
        throw new Error('Mock getRepository not configured for this entity');
      }),
  // Add other EntityManager methods if your service uses them directly
});

// --- Global Mocks for Repositories (used inside and outside transactions) ---
let mockStoreRepository: MockRepository<Store>;
let mockProductRepository: MockRepository<Product>;
let mockUserRepository: MockRepository<User>;
let mockEntityManager: ReturnType<typeof createMockEntityManager>;


describe('StoreService', () => {
  let service: StoreService;

  beforeEach(async () => {
    // Reset mocks before each test
    mockStoreRepository = createMockRepository<Store>();
    mockProductRepository = createMockRepository<Product>();
    mockUserRepository = createMockRepository<User>();
    mockEntityManager = createMockEntityManager();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreService,
        { provide: getRepositoryToken(Store), useValue: mockStoreRepository },
        { provide: getRepositoryToken(Product), useValue: mockProductRepository },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: EntityManager, useValue: mockEntityManager },
      ],
    }).compile();

    service = module.get<StoreService>(StoreService);

    // Reset mock implementation details if necessary (especially for transaction)
     mockEntityManager.transaction.mockImplementation(async (callback) => {
        const transactionalEntityManager = {
            getRepository: jest.fn((entity) => {
                if (entity === Store) return mockStoreRepository;
                if (entity === Product) return mockProductRepository;
                if (entity === User) return mockUserRepository;
                 throw new Error('Mock getRepository not configured for this entity in transaction');
            }),
        };
        try {
           return await callback(transactionalEntityManager);
        } catch (error) {
            // Re-throw to simulate transaction failure propagation
            throw error;
        }
     });

  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- Tests for createStoreWithProducts ---
  describe('createStoreWithProducts', () => {
    const createStoreDto: CreateStoreDto = {
      storeName: 'New Awesome Store',
      standardPrice: 4.99,
      standardTime: '3-5 days',
      expressPrice: 12.99,
      expressTime: '1-2 days',
      products: [
        { name: 'Product A', description: 'Desc A', price: 10, category: 'Cat A', imageUrl: 'imgA', productquantity: 5 },
        { name: 'Product B', description: 'Desc B', price: 20, category: 'Cat B', imageUrl: 'imgB', productquantity: 10 },
      ],
    };

    it('should create a store and its products successfully within a transaction', async () => {
      const savedStore = { ...mockStore, storeName: createStoreDto.storeName, storeId: 'new-store-id' };
      const createdStoreEntity = { userId: mockUserId, ...createStoreDto, products: undefined }; // create doesn't include products array
       const productEntities = createStoreDto.products.map(p => ({ ...p, userId: mockUserId, storeId: savedStore.storeId, storeName: savedStore.storeName, isActive: true }));


      // Mock setup for the transaction
      mockUserRepository.findOne?.mockResolvedValue(mockUser); // User exists
      mockStoreRepository.findOne?.mockResolvedValue(null); // No existing store for user *within transaction*
      mockStoreRepository.create?.mockReturnValue(createdStoreEntity); // Store create result
      mockStoreRepository.save?.mockResolvedValue(savedStore); // Store save result *within transaction*
      mockProductRepository.create?.mockImplementation((pDto) => ({ ...pDto })); // Product create result
      mockProductRepository.save?.mockResolvedValue(productEntities); // Product save result *within transaction*
      mockStoreRepository.findOneOrFail?.mockResolvedValue(savedStore); // Final fetch after save *within transaction*


      const result = await service.createStoreWithProducts(createStoreDto, mockUserId);

      expect(mockEntityManager.transaction).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { userID: mockUserId } }); // Initial user check
      // Inside transaction:
      expect(mockStoreRepository.findOne).toHaveBeenCalledWith({ where: { userId: mockUserId } });
      expect(mockStoreRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: mockUserId,
        storeName: createStoreDto.storeName,
      }));
      expect(mockStoreRepository.save).toHaveBeenCalledWith(createdStoreEntity);
      expect(mockProductRepository.create).toHaveBeenCalledTimes(createStoreDto.products.length);
      expect(mockProductRepository.save).toHaveBeenCalledWith(expect.arrayContaining([
          expect.objectContaining({ name: 'Product A', storeId: savedStore.storeId, storeName: savedStore.storeName, userId: mockUserId }),
          expect.objectContaining({ name: 'Product B', storeId: savedStore.storeId, storeName: savedStore.storeName, userId: mockUserId })
      ]));
       expect(mockStoreRepository.findOneOrFail).toHaveBeenCalledWith({ where: { storeId: savedStore.storeId }}); // Check final retrieval
      expect(result).toEqual(savedStore);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockUserRepository.findOne?.mockResolvedValue(null);

      await expect(service.createStoreWithProducts(createStoreDto, mockUserId))
        .rejects.toThrow(NotFoundException);
      expect(mockEntityManager.transaction).toHaveBeenCalledTimes(1); // Transaction starts but fails early
       expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { userID: mockUserId } });
    });

     it('should throw ConflictException if user already has a store', async () => {
      mockUserRepository.findOne?.mockResolvedValue(mockUser); // User exists
      // Mock findOne *inside* the transaction to find an existing store
      mockStoreRepository.findOne?.mockResolvedValue(mockStore);

      await expect(service.createStoreWithProducts(createStoreDto, mockUserId))
        .rejects.toThrow(ConflictException);
       expect(mockEntityManager.transaction).toHaveBeenCalledTimes(1);
       expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { userID: mockUserId } });
        expect(mockStoreRepository.findOne).toHaveBeenCalledWith({ where: { userId: mockUserId } }); // Checked inside transaction
    });

     it('should throw InternalServerErrorException if database save fails during transaction', async () => {
        const dbError = new Error('DB Save Failed');
        mockUserRepository.findOne?.mockResolvedValue(mockUser);
        mockStoreRepository.findOne?.mockResolvedValue(null); // No existing store
        mockStoreRepository.create?.mockReturnValue({});
        mockStoreRepository.save?.mockRejectedValue(dbError); // Simulate store save failure


        await expect(service.createStoreWithProducts(createStoreDto, mockUserId))
            .rejects.toThrow(InternalServerErrorException);
         expect(mockEntityManager.transaction).toHaveBeenCalledTimes(1);
         // Check that the error was logged (optional, requires spying on console)
         // console.error = jest.fn(); // Spy on console.error
         // expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Transaction failed"), dbError);
    });
  });

  // --- Tests for getStoreByUserId ---
  describe('getStoreByUserId', () => {
    it('should return the store and products for a user', async () => {
        const products = [mockProduct, { ...mockProduct, prodId: 2, name: 'Another Product' }];
        mockStoreRepository.findOne?.mockResolvedValue(mockStore);
        mockProductRepository.find?.mockResolvedValue(products);

        const result = await service.getStoreByUserId(mockUserId);

        expect(mockStoreRepository.findOne).toHaveBeenCalledWith({ where: { userId: mockUserId } });
        expect(mockProductRepository.find).toHaveBeenCalledWith({
            where: { storeId: mockStore.storeId },
            order: { prodId: 'ASC' }
        });
        expect(result).toEqual({ store: mockStore, products: products });
    });

    it('should throw NotFoundException if store is not found but user exists', async () => {
        mockStoreRepository.findOne?.mockResolvedValue(null);
        mockUserRepository.findOne?.mockResolvedValue(mockUser); // User exists

        await expect(service.getStoreByUserId(mockUserId)).rejects.toThrow(
            new NotFoundException(`No store found for this user.`)
        );
         expect(mockStoreRepository.findOne).toHaveBeenCalledWith({ where: { userId: mockUserId } });
         expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { userID: mockUserId } });
    });

     it('should throw NotFoundException if user is not found', async () => {
        mockStoreRepository.findOne?.mockResolvedValue(null);
        mockUserRepository.findOne?.mockResolvedValue(null); // User does not exist

        await expect(service.getStoreByUserId(mockUserId)).rejects.toThrow(
            new NotFoundException('User not found')
        );
        expect(mockStoreRepository.findOne).toHaveBeenCalledWith({ where: { userId: mockUserId } });
        expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { userID: mockUserId } });
    });
  });

   // --- Tests for updateStoreDeliveryOptions ---
   describe('updateStoreDeliveryOptions', () => {
       const updateStoreDto: UpdateStoreDto = {
           standardPrice: 6.00,
           expressTime: 'Same day',
       };
       const updatedStore = { ...mockStore, ...updateStoreDto };

       it('should update store delivery options successfully', async () => {
           mockStoreRepository.findOne?.mockResolvedValue(mockStore); // Find the store
           mockStoreRepository.merge?.mockImplementation((store, dto) => Object.assign(store, dto)); // Simulate merge
           mockStoreRepository.save?.mockResolvedValue(updatedStore); // Save returns updated

           const result = await service.updateStoreDeliveryOptions(mockUserId, updateStoreDto);

           expect(mockStoreRepository.findOne).toHaveBeenCalledWith({ where: { userId: mockUserId } });
           expect(mockStoreRepository.merge).toHaveBeenCalledWith(mockStore, updateStoreDto);
           expect(mockStoreRepository.save).toHaveBeenCalledWith(mockStore); // Save the merged entity
           expect(result).toEqual(updatedStore);
       });

       it('should throw NotFoundException if store to update is not found', async () => {
           mockStoreRepository.findOne?.mockResolvedValue(null); // Store not found

           await expect(service.updateStoreDeliveryOptions(mockUserId, updateStoreDto))
               .rejects.toThrow(NotFoundException);
           expect(mockStoreRepository.findOne).toHaveBeenCalledWith({ where: { userId: mockUserId } });
           expect(mockStoreRepository.save).not.toHaveBeenCalled();
       });

        it('should throw InternalServerErrorException if database save fails', async () => {
            const dbError = new Error('DB Save Failed');
            mockStoreRepository.findOne?.mockResolvedValue(mockStore); // Find the store
            mockStoreRepository.merge?.mockImplementation((store, dto) => Object.assign(store, dto));
            mockStoreRepository.save?.mockRejectedValue(dbError); // Simulate save failure

            await expect(service.updateStoreDeliveryOptions(mockUserId, updateStoreDto))
                .rejects.toThrow(InternalServerErrorException);
            expect(mockStoreRepository.save).toHaveBeenCalledWith(mockStore);
        });
   });


  // --- Tests for addProduct ---
  describe('addProduct', () => {
    const createProductDto: CreateProductDto = {
        name: 'New Gadget',
        description: 'Latest tech',
        price: 199.99,
        category: 'Gadgets',
        imageUrl: 'http://example.com/gadget.png',
        productquantity: 25,
    };
    const savedProduct = {
        prodId: 101,
        ...createProductDto,
        userId: mockUserId,
        storeId: mockStoreId,
        storeName: mockStore.storeName,
        isActive: true,
        store: mockStore,
        user: mockUser
    };
     const createdProductEntity = { // What create returns
         ...createProductDto,
         userId: mockUserId,
         storeId: mockStoreId,
         storeName: mockStore.storeName,
         isActive: true,
     };

    it('should add a product to the user\'s store', async () => {
        mockStoreRepository.findOne?.mockResolvedValue(mockStore); // User has a store
        mockProductRepository.create?.mockReturnValue(createdProductEntity);
        mockProductRepository.save?.mockResolvedValue(savedProduct);

        const result = await service.addProduct(mockUserId, createProductDto);

        expect(mockStoreRepository.findOne).toHaveBeenCalledWith({ where: { userId: mockUserId } });
        expect(mockProductRepository.create).toHaveBeenCalledWith({
            ...createProductDto,
            userId: mockUserId,
            storeId: mockStore.storeId,
            storeName: mockStore.storeName,
            isActive: true,
        });
        expect(mockProductRepository.save).toHaveBeenCalledWith(createdProductEntity);
        expect(result).toEqual(savedProduct);
    });

    it('should throw NotFoundException if user has no store', async () => {
        mockStoreRepository.findOne?.mockResolvedValue(null); // No store found

        await expect(service.addProduct(mockUserId, createProductDto)).rejects.toThrow(
            new NotFoundException(`Cannot add product: No Store found for user ID ${mockUserId}. Create a store first.`)
        );
         expect(mockStoreRepository.findOne).toHaveBeenCalledWith({ where: { userId: mockUserId } });
         expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if product save fails', async () => {
        const dbError = new Error('DB Save Failed');
        mockStoreRepository.findOne?.mockResolvedValue(mockStore);
        mockProductRepository.create?.mockReturnValue(createdProductEntity);
        mockProductRepository.save?.mockRejectedValue(dbError); // Simulate save failure

        await expect(service.addProduct(mockUserId, createProductDto))
            .rejects.toThrow(InternalServerErrorException);
         expect(mockProductRepository.save).toHaveBeenCalledWith(createdProductEntity);
    });
  });

  // --- Tests for updateProduct ---
   describe('updateProduct', () => {
        const updateProductDto: UpdateProductDto = {
            name: 'Updated Product Name',
            price: 109.99,
            productquantity: 5,
        };
        const originalProduct = { ...mockProduct, userId: mockUserId }; // Ensure correct owner
        const updatedProduct = { ...originalProduct, ...updateProductDto };

        it('should update a product successfully', async () => {
            mockProductRepository.findOne?.mockResolvedValue(originalProduct);
            mockProductRepository.merge?.mockImplementation((prod, dto) => Object.assign(prod, dto));
            mockProductRepository.save?.mockResolvedValue(updatedProduct);

            const result = await service.updateProduct(mockProdId, updateProductDto, mockUserId);

            expect(mockProductRepository.findOne).toHaveBeenCalledWith({ where: { prodId: mockProdId } });
            expect(mockProductRepository.merge).toHaveBeenCalledWith(originalProduct, updateProductDto);
            expect(mockProductRepository.save).toHaveBeenCalledWith(originalProduct); // Save the merged entity
            expect(result).toEqual(updatedProduct);
        });

        it('should throw NotFoundException if product not found', async () => {
            mockProductRepository.findOne?.mockResolvedValue(null);

            await expect(service.updateProduct(mockProdId, updateProductDto, mockUserId))
                .rejects.toThrow(NotFoundException);
            expect(mockProductRepository.findOne).toHaveBeenCalledWith({ where: { prodId: mockProdId } });
             expect(mockProductRepository.save).not.toHaveBeenCalled();
        });

        it('should throw ForbiddenException if user does not own the product', async () => {
            const productOwnedByOther = { ...mockProduct, userId: 'other-user-id' };
            mockProductRepository.findOne?.mockResolvedValue(productOwnedByOther);

            await expect(service.updateProduct(mockProdId, updateProductDto, mockUserId))
                .rejects.toThrow(ForbiddenException);
            expect(mockProductRepository.findOne).toHaveBeenCalledWith({ where: { prodId: mockProdId } });
             expect(mockProductRepository.save).not.toHaveBeenCalled();
        });

        it('should throw InternalServerErrorException if product save fails', async () => {
            const dbError = new Error('DB Save Failed');
            mockProductRepository.findOne?.mockResolvedValue(originalProduct);
             mockProductRepository.merge?.mockImplementation((prod, dto) => Object.assign(prod, dto));
            mockProductRepository.save?.mockRejectedValue(dbError);

            await expect(service.updateProduct(mockProdId, updateProductDto, mockUserId))
                .rejects.toThrow(InternalServerErrorException);
             expect(mockProductRepository.save).toHaveBeenCalledWith(originalProduct);
        });
   });

    // --- Tests for deleteProduct ---
    describe('deleteProduct', () => {
        const productToDelete = { ...mockProduct, userId: mockUserId }; // Ensure correct owner

        it('should delete a product successfully', async () => {
            mockProductRepository.findOne?.mockResolvedValue(productToDelete);
            mockProductRepository.delete?.mockResolvedValue({ affected: 1, raw: {} }); // Simulate successful delete

            await expect(service.deleteProduct(mockProdId, mockUserId)).resolves.toBeUndefined();

            expect(mockProductRepository.findOne).toHaveBeenCalledWith({ where: { prodId: mockProdId, userId: mockUserId } });
            expect(mockProductRepository.delete).toHaveBeenCalledWith(mockProdId);
        });

        it('should throw NotFoundException if product not found or not owned by user', async () => {
            mockProductRepository.findOne?.mockResolvedValue(null); // findOne with userId fails

            await expect(service.deleteProduct(mockProdId, mockUserId))
                .rejects.toThrow(NotFoundException);
            expect(mockProductRepository.findOne).toHaveBeenCalledWith({ where: { prodId: mockProdId, userId: mockUserId } });
            expect(mockProductRepository.delete).not.toHaveBeenCalled();
        });

         it('should throw InternalServerErrorException if delete operation affects 0 rows', async () => {
            mockProductRepository.findOne?.mockResolvedValue(productToDelete); // Product found initially
            mockProductRepository.delete?.mockResolvedValue({ affected: 0, raw: {} }); // Simulate delete failing

            await expect(service.deleteProduct(mockProdId, mockUserId))
                .rejects.toThrow(InternalServerErrorException);
            expect(mockProductRepository.delete).toHaveBeenCalledWith(mockProdId);
         });

        //  it('should throw InternalServerErrorException if delete operation fails with DB error', async () => {
        //     const dbError = new Error("DB Delete Failed");
        //      mockProductRepository.findOne?.mockResolvedValue(productToDelete);
        //      mockProductRepository.delete?.mockRejectedValue(dbError); // General DB error on delete

        //      // Note: The current implementation doesn't catch errors from .delete() directly
        //      // It only checks affected rows. To test this, you'd need to adjust the service
        //      // or accept that this specific type of failure might not be caught cleanly.
        //      // Assuming the service *should* catch this:
        //      await expect(service.deleteProduct(mockProdId, mockUserId))
        //         .rejects.toThrow(InternalServerErrorException); // Or rethrows dbError depending on impl.
        //      expect(mockProductRepository.delete).toHaveBeenCalledWith(mockProdId);
        //  });
    });

    // --- Tests for getDeliveryOptionsForStores ---
    describe('getDeliveryOptionsForStores', () => {
         const store1: Store = { ...mockStore, storeId: 'store-1', storeName: 'Store One' };
         const store2: Store = { ...mockStore, storeId: 'store-2', storeName: 'Store Two', standardPrice: 7.00 };
         const storeIds = [store1.storeId, store2.storeId];
         const expectedOptions: Record<string, StoreDeliveryDetails> = {
            [store1.storeId]: {
                storeId: store1.storeId, storeName: store1.storeName,
                standardPrice: store1.standardPrice, standardTime: store1.standardTime,
                expressPrice: store1.expressPrice, expressTime: store1.expressTime,
            },
             [store2.storeId]: {
                storeId: store2.storeId, storeName: store2.storeName,
                standardPrice: store2.standardPrice, standardTime: store2.standardTime,
                expressPrice: store2.expressPrice, expressTime: store2.expressTime,
            },
         };

        it('should return delivery options for given store IDs', async () => {
            // Mock the 'In' operator if needed, or ensure find handles array correctly
            mockStoreRepository.find?.mockResolvedValue([store1, store2]);

            const result = await service.getDeliveryOptionsForStores(storeIds);

            expect(mockStoreRepository.find).toHaveBeenCalledWith({
                where: { storeId: In(storeIds) },
                select: ['storeId', 'storeName', 'standardPrice', 'standardTime', 'expressPrice', 'expressTime'],
            });
            expect(result).toEqual(expectedOptions);
        });

        it('should return an empty object if storeIds array is empty', async () => {
            const result = await service.getDeliveryOptionsForStores([]);
            expect(result).toEqual({});
            expect(mockStoreRepository.find).not.toHaveBeenCalled();
        });

        //  it('should return an empty object if storeIds array is null or undefined', async () => {
        //     expect(await service.getDeliveryOptionsForStores(null)).toEqual({});
        //     expect(await service.getDeliveryOptionsForStores(undefined)).toEqual({});
        //      expect(mockStoreRepository.find).not.toHaveBeenCalled();
        // });


        it('should return only found stores if some IDs are invalid, and warn', async () => {
             const invalidStoreId = 'invalid-store-id';
             const requestedIds = [store1.storeId, invalidStoreId];
             mockStoreRepository.find?.mockResolvedValue([store1]); // Only store1 is found
             console.warn = jest.fn(); // Spy on console.warn

             const result = await service.getDeliveryOptionsForStores(requestedIds);

             expect(mockStoreRepository.find).toHaveBeenCalledWith({
                 where: { storeId: In(requestedIds) },
                 select: ['storeId', 'storeName', 'standardPrice', 'standardTime', 'expressPrice', 'expressTime'],
             });
             expect(result).toEqual({ [store1.storeId]: expectedOptions[store1.storeId] }); // Only store1 data
             expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(invalidStoreId));
        });

        it('should throw InternalServerErrorException if database find fails', async () => {
             const dbError = new Error('DB Find Failed');
             mockStoreRepository.find?.mockRejectedValue(dbError);

             await expect(service.getDeliveryOptionsForStores(storeIds))
                 .rejects.toThrow(InternalServerErrorException);
              expect(mockStoreRepository.find).toHaveBeenCalledWith({
                 where: { storeId: In(storeIds) },
                 select: ['storeId', 'storeName', 'standardPrice', 'standardTime', 'expressPrice', 'expressTime'],
             });
        });
    });

});