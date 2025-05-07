import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController, InitiatePaymentDto } from './payments.controller'; // Import DTO from controller file if defined there
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Import guard if needed for overriding/mocking (not strictly needed for these unit tests)
import { InternalServerErrorException, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';

// Define a type for the mocked request matching controller expectations
interface MockRequestWithUser extends Partial<Request> {
    user?: {
        sub?: string; // User ID from JWT
    };
}

// --- Mock Data ---
const mockUserId = 'auth0|jwt-user-678';
const mockAmount = 5000; // e.g., R50.00 in cents
const mockCurrency = 'ZAR';
const mockCheckoutId = 'co_mock_xyz789';

const mockInitiatePaymentDto: InitiatePaymentDto = {
    amount: mockAmount,
    currency: mockCurrency,
};

// Mock PaymentsService
// We only need to mock the methods used by the controller endpoint being tested
const mockPaymentsService = {
    createYocoCheckout: jest.fn(),
};

describe('PaymentsController', () => {
    let controller: PaymentsController;
    let service: PaymentsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PaymentsController],
            providers: [
                {
                    provide: PaymentsService,
                    useValue: mockPaymentsService, // Use the mock implementation
                },
            ],
        })
        // Example of how to override a guard for testing if needed,
        // but we can often test controller logic by mocking the request object directly.
        // .overrideGuard(JwtAuthGuard)
        // .useValue({ canActivate: jest.fn(() => true) })
        .compile();

        controller = module.get<PaymentsController>(PaymentsController);
        service = module.get<PaymentsService>(PaymentsService);

        // Reset mocks before each test
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // --- Tests for initiateYocoPayment ---
    describe('initiateYocoPayment', () => {
        let mockReq: MockRequestWithUser;

        beforeEach(() => {
            // Set up a valid mock request for most tests
            mockReq = {
                user: {
                    sub: mockUserId,
                },
            };
        });

        it('should call paymentsService.createYocoCheckout and return checkoutId on success', async () => {
            // Arrange
            mockPaymentsService.createYocoCheckout.mockResolvedValue(mockCheckoutId);

            // Act
            const result = await controller.initiateYocoPayment(mockReq as any, mockInitiatePaymentDto); // Cast mockReq

            // Assert
            expect(service.createYocoCheckout).toHaveBeenCalledTimes(1);
            expect(service.createYocoCheckout).toHaveBeenCalledWith(
                mockUserId,
                mockInitiatePaymentDto.amount,
                mockInitiatePaymentDto.currency
            );
            expect(result).toEqual({ checkoutId: mockCheckoutId });
        });

        it('should re-throw HttpException if thrown by the service', async () => {
            // Arrange
            const serviceError = new InternalServerErrorException('Yoco API Error from Service');
            mockPaymentsService.createYocoCheckout.mockRejectedValue(serviceError);

            // Act & Assert
            // Use try/catch to assert the specific error instance if needed, or just check type/message
            try {
                 await controller.initiateYocoPayment(mockReq as any, mockInitiatePaymentDto);
                 fail('Expected HttpException to be thrown'); // Ensure test fails if no error is thrown
            } catch (error) {
                 expect(error).toBeInstanceOf(InternalServerErrorException);
                 expect(error).toBe(serviceError); // Check if it's the exact same instance
                 expect(error.message).toContain('Yoco API Error from Service');
            }


            expect(service.createYocoCheckout).toHaveBeenCalledTimes(1); // Should still be called once
             expect(service.createYocoCheckout).toHaveBeenCalledWith(
                 mockUserId,
                 mockInitiatePaymentDto.amount,
                 mockInitiatePaymentDto.currency
             );
        });

        it('should wrap and throw InternalServerErrorException for generic errors from the service', async () => {
            // Arrange
            const genericError = new Error('Network issue');
            mockPaymentsService.createYocoCheckout.mockRejectedValue(genericError);

            // Act & Assert
             try {
                  await controller.initiateYocoPayment(mockReq as any, mockInitiatePaymentDto);
                  fail('Expected InternalServerErrorException to be thrown');
             } catch (error) {
                  expect(error).toBeInstanceOf(InternalServerErrorException);
                  expect(error.message).toContain(genericError.message); // Check if original message is included
                  expect(error.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
             }


            expect(service.createYocoCheckout).toHaveBeenCalledTimes(1);
             expect(service.createYocoCheckout).toHaveBeenCalledWith(
                 mockUserId,
                 mockInitiatePaymentDto.amount,
                 mockInitiatePaymentDto.currency
             );
        });

         it('should throw TypeError if req.user is missing (guard fail simulation)', async () => {
            // Arrange: Simulate request where user is somehow missing after guard
             const invalidReq = {} as any; // No user property

             // Act & Assert: Accessing req.user.sub will throw TypeError
             await expect(controller.initiateYocoPayment(invalidReq, mockInitiatePaymentDto))
                 .rejects.toThrow(TypeError); // Expect TypeError for accessing 'sub' of undefined

             expect(service.createYocoCheckout).not.toHaveBeenCalled();
         });

          it('should proceed if req.user.sub is undefined/null (potential issue)', async () => {
            // Arrange: Simulate user object exists, but sub is missing
             const reqWithMissingSub: MockRequestWithUser = {
                 user: { sub: undefined },
             };
             mockPaymentsService.createYocoCheckout.mockResolvedValue(mockCheckoutId); // Assume service handles undefined userId gracefully for this test

             // Act
             await controller.initiateYocoPayment(reqWithMissingSub as any, mockInitiatePaymentDto);

             // Assert that the service was called with undefined userId
             expect(service.createYocoCheckout).toHaveBeenCalledTimes(1);
             expect(service.createYocoCheckout).toHaveBeenCalledWith(
                 undefined, // Service called with undefined user ID
                 mockInitiatePaymentDto.amount,
                 mockInitiatePaymentDto.currency
             );
             // Note: This test highlights that the controller doesn't currently validate
             // the presence of userId before calling the service. Add validation if needed.
         });

    }); // End describe('initiateYocoPayment')

}); // End describe('PaymentsController')