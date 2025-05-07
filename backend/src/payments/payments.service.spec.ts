import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios'; // Import axios
import { PaymentsService } from './payments.service';
import { InternalServerErrorException } from '@nestjs/common';

// Mock the entire axios module
jest.mock('axios');

// Create a typed mocked version of axios for better intellisense/type checking
// We specifically need to mock the 'post' method.
const mockedAxiosPost = axios.post as jest.Mock;

// --- Mock Data ---
const mockYocoSecretKey = 'sk_test_mock_secret_key_12345';
const mockUserId = 'auth0|user-payment-test';
const mockAmountInCents = 1000; // e.g., R10.00
const mockCurrency = 'ZAR';
const mockCheckoutId = 'co_test_abcdef123456';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockConfigService: Partial<ConfigService>; // Use Partial for simplicity

  beforeEach(async () => {
    // Reset mocks before each test
    mockedAxiosPost.mockClear();

    // Default mock implementation for ConfigService
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'YOCO_SECRET_KEY') {
          return mockYocoSecretKey; // Provide the key by default
        }
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: ConfigService,
          useValue: mockConfigService, // Provide the mock ConfigService
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- Initialization Tests ---
  describe('Initialization', () => {
    it('should initialize correctly with YOCO_SECRET_KEY provided', () => {
      // Service is already initialized in beforeEach with the default mock
      expect(mockConfigService.get).toHaveBeenCalledWith('YOCO_SECRET_KEY', expect.any(String)); // Check default value access if applicable
      // Access the private property for assertion (use with caution, alternative is to test behavior relying on the key)
      expect((service as any).yocoSecretKey).toBe(mockYocoSecretKey);
    });

    it('should throw an error if YOCO_SECRET_KEY is not configured', () => {
      // Override the mock for this specific test
      (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'YOCO_SECRET_KEY') {
          return undefined; // Simulate missing key
        }
        return undefined;
      });

      // Expect the constructor *during module compilation/service creation* to throw
      // We need to re-compile the module here to test constructor logic
      const testModule = Test.createTestingModule({
        providers: [
          PaymentsService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      });

      // Check if the compilation itself throws, or getting the service throws
      expect(testModule.compile()).rejects.toThrow(
          'Yoco Secret Key (YOCO_SECRET_KEY) is not configured in environment variables.'
      );
    });
  });


  // --- Tests for createYocoCheckout ---
  describe('createYocoCheckout', () => {
    const yocoApiUrl = 'https://payments.yoco.com/api/checkouts';
    const expectedPayload = {
      amount: mockAmountInCents,
      currency: mockCurrency,
    };
    const expectedHeaders = {
      'Authorization': `Bearer ${mockYocoSecretKey}`,
      'Content-Type': 'application/json',
    };

    it('should call Yoco API and return checkout ID on success', async () => {
      // Arrange: Mock axios.post to resolve successfully
      const mockYocoResponse = {
        data: { id: mockCheckoutId }, // Simulate Yoco's response structure
        status: 200, // Or 201 depending on API
        statusText: 'OK',
        headers: {},
        config: {} as any, // Add required AxiosResponse properties
      };
      mockedAxiosPost.mockResolvedValue(mockYocoResponse);

      // Act
      const checkoutId = await service.createYocoCheckout(
        mockUserId,
        mockAmountInCents,
        mockCurrency
      );

      // Assert
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockedAxiosPost).toHaveBeenCalledWith(
        yocoApiUrl,
        expectedPayload,
        { headers: expectedHeaders }
      );
      expect(checkoutId).toBe(mockCheckoutId);
    });



     it('should throw InternalServerErrorException if Yoco API response is missing checkout ID', async () => {
       // Arrange: Mock axios.post to resolve successfully but without 'id'
       const mockYocoResponseMissingId = {
         data: { message: 'Checkout initiated but no ID field' }, // Missing 'id'
         status: 200,
         statusText: 'OK',
         headers: {},
         config: {} as any,
       };
       mockedAxiosPost.mockResolvedValue(mockYocoResponseMissingId);

       // Act & Assert
       await expect(
         service.createYocoCheckout(mockUserId, mockAmountInCents, mockCurrency)
       ).rejects.toThrow(InternalServerErrorException);

       await expect(
         service.createYocoCheckout(mockUserId, mockAmountInCents, mockCurrency)
       ).rejects.toThrow('Failed to retrieve checkoutId from Yoco response.');

       expect(mockedAxiosPost).toHaveBeenCalledTimes(2); // Called twice due to expect().rejects
       expect(mockedAxiosPost).toHaveBeenCalledWith(
         yocoApiUrl,
         expectedPayload,
         { headers: expectedHeaders }
       );
     });

     it('should throw InternalServerErrorException on network error or other non-API errors', async () => {
       // Arrange: Mock axios.post to reject with a generic error
       const networkError = new Error("Network connection failed");
       mockedAxiosPost.mockRejectedValue(networkError);

       // Act & Assert
       await expect(
         service.createYocoCheckout(mockUserId, mockAmountInCents, mockCurrency)
       ).rejects.toThrow(InternalServerErrorException);

       await expect(
         service.createYocoCheckout(mockUserId, mockAmountInCents, mockCurrency)
       ).rejects.toThrow(
         expect.objectContaining({
           message: expect.stringContaining(`Could not create Yoco checkout session: ${networkError.message}`)
         })
       );

       expect(mockedAxiosPost).toHaveBeenCalledWith(
         yocoApiUrl,
         expectedPayload,
         { headers: expectedHeaders }
       );
     });
  });

});