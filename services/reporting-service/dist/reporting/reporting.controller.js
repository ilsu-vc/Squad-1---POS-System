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
exports.ReportingController = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase.service");
const zod_validation_pipe_1 = require("../zod-validation.pipe");
const schemas_1 = require("../schemas");
let ReportingController = class ReportingController {
    supabaseService;
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async getActivityLogs() {
        const client = this.supabaseService.getClient();
        const { data, error } = await client
            .from('user_activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5000);
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { logs: data || [] };
    }
    async createActivityLog(body) {
        const { userId, userEmail, actionType, actionDetails, entityType, entityId } = body;
        const client = this.supabaseService.getClient();
        const { error } = await client.from('user_activity_logs').insert({
            user_id: userId,
            user_email: userEmail,
            action_type: actionType,
            action_details: actionDetails,
            entity_type: entityType,
            entity_id: entityId,
        });
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { success: true };
    }
    async getShiftRecords() {
        const client = this.supabaseService.getClient();
        const { data, error } = await client
            .from('shift_records')
            .select(`
        id,
        clock_in_at,
        clock_out_at,
        total_hours,
        handover_notes,
        cash_discrepancies,
        issues,
        pending_items,
        user_profiles (full_name, email, role)
      `)
            .order('clock_in_at', { ascending: false })
            .limit(5000);
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { records: data || [] };
    }
};
exports.ReportingController = ReportingController;
__decorate([
    (0, common_1.Get)('activity-logs'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "getActivityLogs", null);
__decorate([
    (0, common_1.Post)('activity-logs'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schemas_1.CreateActivityLogSchema)),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "createActivityLog", null);
__decorate([
    (0, common_1.Get)('shift-records'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "getShiftRecords", null);
exports.ReportingController = ReportingController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], ReportingController);
//# sourceMappingURL=reporting.controller.js.map