import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from frontend to get OLD project keys
dotenv.config({ path: path.resolve(__dirname, '../../pos-frontend/.env') });
const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Load env from inventory-service to get NEW project keys
dotenv.config({ path: path.resolve(__dirname, '../../pos-backend/inventory-service/.env') });
const newUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const newKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function syncStock() {
    console.log('🚀 Starting Stock Sync...');
    console.log(`📡 From (Old): ${oldUrl}`);
    console.log(`📡 To (New): ${newUrl}`);

    const oldClient = createClient(oldUrl!, oldKey!);
    const newClient = createClient(newUrl!, newKey!);

    // 1. Fetch products from Old project
    const { data: oldProducts, error: oldErr } = await oldClient
        .from('products')
        .select('id, name, stock, low_stock_threshold');

    if (oldErr) {
        console.error('❌ Error fetching old products:', oldErr);
        return;
    }

    console.log(`📦 Found ${oldProducts.length} products in Old Project.`);

    // 2. Update products in New project
    for (const p of oldProducts) {
        const { error: newErr } = await newClient
            .from('products')
            .update({ 
                stock: p.stock, 
                low_stock_threshold: p.low_stock_threshold 
            })
            .eq('id', p.id);

        if (newErr) {
            console.log(`⚠️ Failed to sync ${p.name}: ${newErr.message}`);
        } else {
            console.log(`✅ Synced ${p.name}: Stock = ${p.stock}`);
        }
    }

    console.log('✨ Sync Complete!');
}

syncStock();
