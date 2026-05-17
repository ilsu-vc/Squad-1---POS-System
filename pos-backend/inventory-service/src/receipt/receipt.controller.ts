import { Controller, Get, Post, Body } from '@nestjs/common';
import { ReceiptService } from './receipt.service';

@Controller('receipt')
export class ReceiptController {
    constructor(private readonly receiptService: ReceiptService) { }

    @Get('info')
    getReceiptInfo() {
        return this.receiptService.getLatest();
    }

    @Post('info')
    saveReceiptInfo(@Body() body: any) {
        return this.receiptService.save(body);
    }
}