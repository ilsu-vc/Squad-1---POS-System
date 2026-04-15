import { SupabaseService } from '../supabase.service';
export declare class AuthController {
    private readonly supabaseService;
    constructor(supabaseService: SupabaseService);
    login(body: any): Promise<{
        session: import("@supabase/auth-js").Session;
        user: import("@supabase/auth-js").User;
    }>;
    logout(): Promise<{
        success: boolean;
    }>;
    getSession(): Promise<{
        session: import("@supabase/auth-js").Session | null;
    }>;
    getProfile(userId: string): Promise<{
        profile: {
            id: any;
            email: any;
            full_name: any;
            role: any;
            role_id: any;
            is_active: any;
        };
    }>;
    changePassword(body: any): Promise<{
        success: boolean;
    }>;
}
