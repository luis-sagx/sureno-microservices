import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CreatePromotion } from './application/create-promotion.use-case.js';
import { DeactivatePrice } from './application/deactivate-price.use-case.js';
import { DeactivatePromotion } from './application/deactivate-promotion.use-case.js';
import { QuotePrices } from './application/quote-prices.use-case.js';
import { SetPrice } from './application/set-price.use-case.js';
import { UpdatePrice } from './application/update-price.use-case.js';
import { UpdatePromotion } from './application/update-promotion.use-case.js';
import { PRICING_SESSION_PORT } from './application/pricing.tokens.js';
import type { PricingSessionPort } from './application/pricing-session.port.js';
import { PricingAdminGuard } from './pricing-admin.guard.js';

@Controller('prices')
export class PricingController {
  constructor(
    private readonly quotes: QuotePrices,
    private readonly setPrice: SetPrice,
    private readonly createPromotion: CreatePromotion,
    private readonly updatePrice: UpdatePrice,
    private readonly deactivatePrice: DeactivatePrice,
    private readonly updatePromotion: UpdatePromotion,
    private readonly deactivatePromotion: DeactivatePromotion,
    @Inject(PRICING_SESSION_PORT) private readonly sessions: PricingSessionPort,
  ) {}

  @Get('quotes')
  quote(@Query('presentation_ids') values: string | undefined, @Req() request: Request) {
    return this.quotes.execute({
      presentationIds: values?.split(',').map((value) => value.trim()).filter(Boolean) ?? [],
      credentials: { cookie: request.headers.cookie, authorization: request.headers.authorization },
    });
  }

  @Post('admin/prices') @UseGuards(PricingAdminGuard)
  createPrice(@Body() body: Record<string, unknown>, @Req() request: Request & { pricingAdminId?: string }) {
    return this.setPrice.execute(body, request.pricingAdminId!);
  }

  @Patch('admin/prices/:id') @UseGuards(PricingAdminGuard)
  patchPrice(@Param('id') id: string, @Body() body: Record<string, unknown>, @Req() request: Request & { pricingAdminId?: string }) {
    return this.updatePrice.execute(id, body, request.pricingAdminId!);
  }

  @Delete('admin/prices/:id') @UseGuards(PricingAdminGuard)
  removePrice(@Param('id') id: string, @Req() request: Request & { pricingAdminId?: string }) {
    return this.deactivatePrice.execute(id, request.pricingAdminId!);
  }

  @Get('admin/prices/:id/history') @UseGuards(PricingAdminGuard)
  async priceHistory(@Param('id') id: string) { return this.updatePrice.history(id); }

  @Get('admin/promotions') @UseGuards(PricingAdminGuard)
  async promotions() { return this.createPromotion.list(); }

  @Post('admin/promotions') @UseGuards(PricingAdminGuard)
  createPromo(@Body() body: Record<string, unknown>, @Req() request: Request & { pricingAdminId?: string }) {
    return this.createPromotion.execute(body, request.pricingAdminId!);
  }

  @Patch('admin/promotions/:id') @UseGuards(PricingAdminGuard)
  patchPromo(@Param('id') id: string, @Body() body: Record<string, unknown>, @Req() request: Request & { pricingAdminId?: string }) {
    return this.updatePromotion.execute(id, body, request.pricingAdminId!);
  }

  @Delete('admin/promotions/:id') @UseGuards(PricingAdminGuard)
  removePromo(@Param('id') id: string, @Req() request: Request & { pricingAdminId?: string }) {
    return this.deactivatePromotion.execute(id, request.pricingAdminId!);
  }

  @Get('admin/promotions/:id/history') @UseGuards(PricingAdminGuard)
  async promotionHistory(@Param('id') id: string) { return this.updatePromotion.history(id); }
}
