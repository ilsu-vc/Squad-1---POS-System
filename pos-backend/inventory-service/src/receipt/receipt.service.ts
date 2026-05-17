import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';

@Injectable()
export class ReceiptService {
    constructor(private readonly supabaseService: SupabaseService) { }

    async getLatest() {
        const client = this.supabaseService.getClient();

        const { data, error } = await client
            .from('customer_receipt_info')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw new Error(error.message);
        }

        return data || { name: '', tin: '', address: '' };
    }

    async save(body: any) {
        const client = this.supabaseService.getClient();

        const { error } = await client
            .from('customer_receipt_info')
            .insert({
                name: body.name,
                tin: body.tin,
                address: body.address,
            });

        if (error) throw new Error(error.message);

        return { success: true };
    }
}