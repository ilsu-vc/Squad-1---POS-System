"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftController = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase.service");
const zod_validation_pipe_1 = require("../zod-validation.pipe");
const schemas_1 = require("../schemas");
let ShiftController = class ShiftController {
    supabaseService;
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async clockIn(body) {
        const { userId } = body;
        const client = this.supabaseService.getClient();
        const { data, error } = await client
            .from('shift_records')
            .insert({ user_id: userId, clock_in_at: new Date().toISOString() })
            .select()
            .single();
        if (error) {
            if (error.message.includes('shift_records_one_open_shift_per_user') || error.code === '23505') {
                throw new common_1.BadRequestException('User already has an open shift');
            }
            throw new common_1.InternalServerErrorException(error.message);
        }
        return { shift: data };
    }
    async clockOut(body) {
        const { shiftId, userId, clockOutAt, totalHours, handoverNotes, cashDiscrepancies, issues, pendingItems } = body;
        const client = this.supabaseService.getClient();
        const { error } = await client
            .from('shift_records')
            .update({
            clock_out_at: clockOutAt,
            total_hours: totalHours,
            handover_notes: handoverNotes || null,
            cash_discrepancies: cashDiscrepancies || null,
            issues: issues || null,
            pending_items: pendingItems || null,
        })
            .eq('id', shiftId)
            .eq('user_id', userId);
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { success: true };
    }
    async getActiveShift(userId) {
        if (!/^[0-9a-f-]{36}$/i.test(userId)) {
            throw new common_1.BadRequestException('Invalid userId format');
        }
        const client = this.supabaseService.getClient();
        const { data, error } = await client
            .from('shift_records')
            .select('id, user_id, clock_in_at, clock_out_at, total_hours, created_at, handover_notes, cash_discrepancies, issues, pending_items')
            .eq('user_id', userId)
            .is('clock_out_at', null)
            .order('clock_in_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { shift: data };
    }
    async getLatestHandover() {
        const client = this.supabaseService.getClient();
        const { data, error } = await client
            .from('shift_records')
            .select('id, user_id, clock_in_at, clock_out_at, total_hours, created_at, handover_notes, cash_discrepancies, issues, pending_items')
            .not('clock_out_at', 'is', null)
            .or('handover_notes.not.is.null,cash_discrepancies.not.is.null,issues.not.is.null,pending_items.not.is.null')
            .order('clock_out_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { handover: data };
    }
};
exports.ShiftController = ShiftController;
__decorate([
    (0, common_1.Post)('clock-in'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schemas_1.ClockInSchema)),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ShiftController.prototype, "clockIn", null);
__decorate([
    (0, common_1.Post)('clock-out'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schemas_1.ClockOutSchema)),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ShiftController.prototype, "clockOut", null);
__decorate([
    (0, common_1.Get)('active/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShiftController.prototype, "getActiveShift", null);
__decorate([
    (0, common_1.Get)('latest-handover'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ShiftController.prototype, "getLatestHandover", null);
exports.ShiftController = ShiftController = __decorate([
    (0, common_1.Controller)('shift'),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], ShiftController);
//# sourceMappingURL=shift.controller.js.map