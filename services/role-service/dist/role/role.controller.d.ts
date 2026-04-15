import { SupabaseService } from '../supabase.service';
export declare class RoleController {
    private readonly supabaseService;
    constructor(supabaseService: SupabaseService);
    getUsers(): Promise<{
        users: {
            id: any;
            email: any;
            full_name: any;
            role: any;
            role_id: any;
            is_active: any;
        }[];
    }>;
    getUser(id: string): Promise<{
        user: {
            id: any;
            email: any;
            full_name: any;
            role: any;
            role_id: any;
            is_active: any;
        };
    }>;
    updateRole(id: string, body: any): Promise<{
        user: any;
    }>;
    toggleActive(id: string, body: any): Promise<{
        user: any;
    }>;
    resetPassword(body: any): Promise<{
        success: boolean;
        message: string;
    }>;
}
