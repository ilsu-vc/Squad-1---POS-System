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
exports.RoleController = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase.service");
const zod_validation_pipe_1 = require("../zod-validation.pipe");
const schemas_1 = require("../schemas");
let RoleController = class RoleController {
    supabaseService;
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async getUsers() {
        const client = this.supabaseService.getClient();
        const { data, error } = await client
            .from('user_profiles')
            .select('id, email, full_name, role, role_id, is_active')
            .order('email', { ascending: true });
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { users: data || [] };
    }
    async getUser(id) {
        if (!/^[0-9a-f-]{36}$/i.test(id))
            throw new common_1.BadRequestException('Invalid user id format');
        const client = this.supabaseService.getClient();
        const { data, error } = await client
            .from('user_profiles')
            .select('id, email, full_name, role, role_id, is_active')
            .eq('id', id)
            .single();
        if (error)
            throw new common_1.NotFoundException(error.message);
        return { user: data };
    }
    async updateRole(id, body) {
        if (!/^[0-9a-f-]{36}$/i.test(id))
            throw new common_1.BadRequestException('Invalid user id format');
        const { role } = body;
        const client = this.supabaseService.getClient();
        const { data: roleRow, error: roleError } = await client
            .from('roles')
            .select('id, role_key')
            .eq('role_key', role)
            .single();
        if (roleError)
            throw new common_1.InternalServerErrorException(roleError.message);
        const { data, error } = await client
            .from('user_profiles')
            .update({ role, role_id: roleRow.id })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { user: data };
    }
    async toggleActive(id, body) {
        if (!/^[0-9a-f-]{36}$/i.test(id))
            throw new common_1.BadRequestException('Invalid user id format');
        const { is_active } = body;
        const client = this.supabaseService.getClient();
        const { data, error } = await client
            .from('user_profiles')
            .update({ is_active })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { user: data };
    }
    async resetPassword(body) {
        const { email } = body;
        const client = this.supabaseService.getClient();
        const { error } = await client.auth.resetPasswordForEmail(email);
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { success: true, message: 'If that email exists, a reset link has been sent.' };
    }
};
exports.RoleController = RoleController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RoleController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RoleController.prototype, "getUser", null);
__decorate([
    (0, common_1.Put)(':id/role'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schemas_1.UpdateRoleSchema)),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RoleController.prototype, "updateRole", null);
__decorate([
    (0, common_1.Put)(':id/active'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schemas_1.ToggleActiveSchema)),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RoleController.prototype, "toggleActive", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schemas_1.ResetPasswordSchema)),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RoleController.prototype, "resetPassword", null);
exports.RoleController = RoleController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], RoleController);
//# sourceMappingURL=role.controller.js.map