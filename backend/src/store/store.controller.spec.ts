// store.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { StoreController } from './store.controller';
import { StoreService, StoreDeliveryDetails } from './store.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';
import { GetDeliveryOptionsDto } from './dto/get-delivery-options.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { Product } from '../products/entities/product.entity';
import { Store } from './entities/store.entity';
import { NotFoundException, BadRequestException, HttpStatus, InternalServerErrorException } from '@nestjs/common';


// Interface defined in controller (or import if external)
interface RequestWithUser extends Request {
    user: { sub: string };
  }
// --- Mock Data ---
const mockUserId = 'user-jwt-123';
const mockStoreId = 'store-abc-456';
const mockProductId = 101;

// Mock Store Entity
const mockStore: Store = {
  storeId: mockStoreId,
  userId: mockUserId,
  storeName: 'Test Store',
  standardTime: '48 hours',
  standardPrice: 10.50,
  expressTime: '24 hours',
  expressPrice: 20.00,
  user: { userId: mockUserId } as any, // Mock user object, adjust fields as needed
  products: [],
};

// Mock Product Entity
const mockProduct: Product = {
  prodId: mockProductId,
  name: 'Test Product',
  price: 50.00,
  productquantity: 10,
  description: 'A product for testing',
  imageUrl: 'test.jpg',
  storeName: mockStore.storeName, // Denormalized?
  storeId: mockStore.storeId,     // Denormalized?
  category: 'Testing',           // Or productCategory?
  isActive: true,
  userId: mockUserId,            // Added missing property
  store: mockStore,              // Added missing property

  // Add relations if defined, e.g.:
  // categoryId: 1,
};

// Mock Delivery Details
const mockDeliveryDetails: StoreDeliveryDetails = {
    storeId: mockStore.storeId,
    storeName: mockStore.storeName,
    standardTime: mockStore.standardTime,
    standardPrice: mockStore.standardPrice,
    expressTime: mockStore.expressTime,
    expressPrice: mockStore.expressPrice,
};

// --- Mock Service ---
const mockStoreService = {
  createStoreWithProducts: jest.fn(),
  getStoreByUserId: jest.fn(),
  updateStoreDeliveryOptions: jest.fn(),
  addProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
  getDeliveryOptionsForStores: jest.fn(),
};

// Mock Request Object Helper
const mockRequest = (userId: string) => ({
    user: { sub: userId },
  } as RequestWithUser); // <-- Add type assertion here

// --- Test Suite ---
describe('StoreController', () => {
  let controller: StoreController;
  let service: typeof mockStoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreController],
      providers: [
        {
          provide: StoreService,
          useValue: mockStoreService,
        },
      ],
    })
      // Bypass the actual AuthGuard('jwt') for all tests in this suite
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<StoreController>(StoreController);
    service = module.get(StoreService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // --- createStore Tests ---
  describe('createStore', () => {
    it('should call service createStoreWithProducts and return the created store', async () => {
      const createStoreDto: CreateStoreDto = {
        storeName: 'New Store',
        standardTime: '72 hours',
        standardPrice: 5.0,
        expressTime: '36 hours',
        expressPrice: 12.0,
        products: [{ name: 'Initial Product', price: 10, productquantity: 5, category: 'Initial' }],
      };
      const req = mockRequest(mockUserId);
      service.createStoreWithProducts.mockResolvedValue(mockStore); // Return a mock store

      const result = await controller.createStore(createStoreDto, req);

      expect(service.createStoreWithProducts).toHaveBeenCalledWith(createStoreDto, mockUserId);
      expect(result).toEqual(mockStore);
    });

    it('should propagate errors from the service', async () => {
       const createStoreDto: CreateStoreDto = { /* ... */ } as any;
       const req = mockRequest(mockUserId);
       const serviceError = new BadRequestException('Invalid data');
       service.createStoreWithProducts.mockRejectedValue(serviceError);

       await expect(controller.createStore(createStoreDto, req)).rejects.toThrow(serviceError);
    });
  });

  // --- getMyStore Tests ---
  describe('getMyStore', () => {
    it('should call service getStoreByUserId and return the store and products', async () => {
      const storeWithProducts = { store: mockStore, products: [mockProduct] };
      const req = mockRequest(mockUserId);
      service.getStoreByUserId.mockResolvedValue(storeWithProducts);

      const result = await controller.getMyStore(req);

      expect(service.getStoreByUserId).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(storeWithProducts);
    });

    it('should throw NotFoundException if service throws it', async () => {
        const req = mockRequest(mockUserId);
        const serviceError = new NotFoundException('Store not found for this user');
        service.getStoreByUserId.mockRejectedValue(serviceError);

        await expect(controller.getMyStore(req)).rejects.toThrow(serviceError);
     });
  });

  // --- updateMyStoreDeliveryOptions Tests ---
  describe('updateMyStoreDeliveryOptions', () => {
    it('should call service updateStoreDeliveryOptions and return the updated store', async () => {
        const updateDto: UpdateStoreDto = {
            standardTime: '40 hours',
            standardPrice: 11.00,
            // Only include fields being updated as per DTO definition
        };
        const updatedStore = { ...mockStore, ...updateDto }; // Simulate updated store
        const req = mockRequest(mockUserId);
        service.updateStoreDeliveryOptions.mockResolvedValue(updatedStore);

        const result = await controller.updateMyStoreDeliveryOptions(updateDto, req);

        expect(service.updateStoreDeliveryOptions).toHaveBeenCalledWith(mockUserId, updateDto);
        expect(result).toEqual(updatedStore);
    });

     it('should throw NotFoundException if service throws it', async () => {
        const updateDto: UpdateStoreDto = { /* ... */ } as any;
        const req = mockRequest(mockUserId);
        const serviceError = new NotFoundException('User store not found');
        service.updateStoreDeliveryOptions.mockRejectedValue(serviceError);

        await expect(controller.updateMyStoreDeliveryOptions(updateDto, req)).rejects.toThrow(serviceError);
     });

      it('should throw BadRequestException if service throws it (e.g., validation)', async () => {
        const updateDto: UpdateStoreDto = { /* ... */ } as any;
        const req = mockRequest(mockUserId);
        const serviceError = new BadRequestException('Invalid price format');
        service.updateStoreDeliveryOptions.mockRejectedValue(serviceError);

        await expect(controller.updateMyStoreDeliveryOptions(updateDto, req)).rejects.toThrow(serviceError);
     });
  });

  // --- addProduct Tests ---
  describe('addProduct', () => {
    it('should call service addProduct and return the created product', async () => {
        const productDto: CreateProductDto = {
            name: 'New Product',
            price: 25.0,
            productquantity: 15,
            category: 'New Category',
            // imageUrl and description might be optional
        };
        const req = mockRequest(mockUserId);
        service.addProduct.mockResolvedValue(mockProduct); // Return a mock product

        const result = await controller.addProduct(productDto, req);

        expect(service.addProduct).toHaveBeenCalledWith(mockUserId, productDto);
        expect(result).toEqual(mockProduct);
    });

     it('should throw NotFoundException if service throws it (e.g., user store not found)', async () => {
        const productDto: CreateProductDto = { /* ... */ } as any;
        const req = mockRequest(mockUserId);
        const serviceError = new NotFoundException('User store not found to add product');
        service.addProduct.mockRejectedValue(serviceError);

        await expect(controller.addProduct(productDto, req)).rejects.toThrow(serviceError);
     });
  });

  // --- updateProduct Tests ---
  describe('updateProduct', () => {
    it('should call service updateProduct and return the updated product', async () => {
        const updateProductDto: UpdateProductDto = { name: 'Updated Product Name' };
        const updatedProduct = { ...mockProduct, ...updateProductDto };
        const req = mockRequest(mockUserId);
        service.updateProduct.mockResolvedValue(updatedProduct);

        const result = await controller.updateProduct(mockProductId, updateProductDto, req);

        expect(service.updateProduct).toHaveBeenCalledWith(mockProductId, updateProductDto, mockUserId);
        expect(result).toEqual(updatedProduct);
    });

     it('should throw NotFoundException if service throws it (product/store not found or auth failed)', async () => {
        const updateProductDto: UpdateProductDto = { /* ... */ } as any;
        const req = mockRequest(mockUserId);
        const serviceError = new NotFoundException('Product not found or access denied');
        service.updateProduct.mockRejectedValue(serviceError);

        await expect(controller.updateProduct(mockProductId, updateProductDto, req)).rejects.toThrow(serviceError);
     });
  });

  // --- deleteProduct Tests ---
  describe('deleteProduct', () => {
    it('should call service deleteProduct and return void (204 status)', async () => {
        const req = mockRequest(mockUserId);
        service.deleteProduct.mockResolvedValue(undefined); // Simulate successful void return

        // Act: Call the controller method. The void return and @HttpCode handle the 204 status.
        await controller.deleteProduct(mockProductId, req);

        // Assert
        expect(service.deleteProduct).toHaveBeenCalledWith(mockProductId, mockUserId);
        // No explicit return value to check for 204
    });

    it('should throw NotFoundException if service throws it', async () => {
        const req = mockRequest(mockUserId);
        const serviceError = new NotFoundException('Product not found or access denied for deletion');
        service.deleteProduct.mockRejectedValue(serviceError);

        await expect(controller.deleteProduct(mockProductId, req)).rejects.toThrow(serviceError);
     });
  });

  // --- getDeliveryOptions Tests ---
  describe('getDeliveryOptions', () => {
    it('should call service getDeliveryOptionsForStores and return delivery details record', async () => {
        const getDeliveryOptionsDto: GetDeliveryOptionsDto = { storeIds: [mockStoreId, 'another-store-id'] };
        const deliveryDetailsRecord: Record<string, StoreDeliveryDetails> = {
            [mockStoreId]: mockDeliveryDetails,
            'another-store-id': { /* details for other store */ } as any,
        };
        service.getDeliveryOptionsForStores.mockResolvedValue(deliveryDetailsRecord);

        const result = await controller.getDeliveryOptions(getDeliveryOptionsDto);

        expect(service.getDeliveryOptionsForStores).toHaveBeenCalledWith(getDeliveryOptionsDto.storeIds);
        expect(result).toEqual(deliveryDetailsRecord);
    });

     it('should propagate errors from the service', async () => {
        const getDeliveryOptionsDto: GetDeliveryOptionsDto = { storeIds: ['id1'] };
        const serviceError = new InternalServerErrorException('Failed to fetch delivery details');
        service.getDeliveryOptionsForStores.mockRejectedValue(serviceError);

        await expect(controller.getDeliveryOptions(getDeliveryOptionsDto)).rejects.toThrow(serviceError);
     });
  });

});