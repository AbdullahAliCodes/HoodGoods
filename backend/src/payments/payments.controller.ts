// --- payments.controller.ts ---
import { Controller, Post, Body, Req, UseGuards, HttpCode, HttpStatus, InternalServerErrorException, HttpException } from '@nestjs/common'; // Import HttpException
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Your JWT guard
import { PaymentsService } from './payments.service';

// interface InitiatePaymentDto {
//   amount: number; // Expect amount in cents
//   currency: string;
//   // Add other fields if needed (e.g., cart details)
// }
export interface InitiatePaymentDto {
  amount: number; // Expect amount in cents
  currency: string;
  // Add other fields if needed (e.g., cart details)
}
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('initiate-yoco')
  async initiateYocoPayment(
    @Req() req,
    @Body() initiatePaymentDto: InitiatePaymentDto,
  ) {
    const userId = req.user.sub; // Get user ID from JWT payload
    try {
      console.log(`[PaymentsController] User ${userId} initiating payment with DTO:`, initiatePaymentDto);
      console.log(`[PaymentsController] Calling paymentsService.createYocoCheckout...`);
      const checkoutId = await this.paymentsService.createYocoCheckout(
        userId,
        initiatePaymentDto.amount,
        initiatePaymentDto.currency,
      );
      console.log(`[PaymentsController] Successfully obtained checkoutId: ${checkoutId}`);
      return { checkoutId };
    } catch (error) {
      // Log the full error object caught from the service
      console.error("[PaymentsController] Error caught from PaymentsService:", error);

      // Check if it's already an HttpException (like InternalServerErrorException from the service)
      if (error instanceof HttpException) {
        throw error; // Re-throw NestJS HTTP exceptions directly
      }

      // Otherwise, wrap it in a generic InternalServerErrorException
      throw new InternalServerErrorException(error.message || "Could not initiate payment.");
    }
  }

  // --- Removed Yoco Webhook Endpoint ---

}