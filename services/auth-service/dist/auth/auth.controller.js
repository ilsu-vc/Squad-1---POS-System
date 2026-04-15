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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase.service");
const zod_validation_pipe_1 = require("../zod-validation.pipe");
const schemas_1 = require("../schemas");
let AuthController = class AuthController {
    supabaseService;
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async login(body) {
        const { email, password } = body;
        const client = this.supabaseService.getClient();
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error)
            throw new common_1.UnauthorizedException(error.message);
        return { session: data.session, user: data.user };
    }
    async logout() {
        const client = this.supabaseService.getClient();
        const { error } = await client.auth.signOut();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { success: true };
    }
    async getSession() {
        const client = this.supabaseService.getClient();
        const { data, error } = await client.auth.getSession();
        if (error)
            throw new common_1.UnauthorizedException(error.message);
        return { session: data.session };
    }
    async getProfile(userId) {
        if (!/^[0-9a-f-]{36}$/i.test(userId)) {
            throw new common_1.BadRequestException('Invalid userId format');
        }
        const client = this.supabaseService.getClient();
        const { data, error } = await client
            .from('user_profiles')
            .select('id, email, full_name, role, role_id, is_active')
            .eq('id', userId)
            .single();
        if (error)
            throw new common_1.NotFoundException(error.message);
        return { profile: data };
    }
    async changePassword(body) {
        const { newPassword } = body;
        const client = this.supabaseService.getClient();
        const { error } = await client.auth.updateUser({ password: newPassword });
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { success: true };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schemas_1.LoginSchema)),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('logout'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('session'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getSession", null);
__decorate([
    (0, common_1.Get)('profile/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Post)('password/change'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schemas_1.ChangePasswordSchema)),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map