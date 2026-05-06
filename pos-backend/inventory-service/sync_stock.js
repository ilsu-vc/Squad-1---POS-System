const { createClient } = require('@supabase/supabase-js');

// OLD Project (Source)
const oldUrl = 'https://vxwtibmxrhxuyujqzvze.supabase.co';
const oldKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4d3RpYm14cmh4dXl1anF6dnplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU1NTA2MiwiZXhwIjoyMDg3MTMxMDYyfQ.cjG0Ya-z_zN4vvXMfTqBBhHIyvdTXgy-e8GAntVqXF8';

// NEW Project (Destination)
const newUrl = 'https://ssadhlawuzfefsizyhud.supabase.co';
const newKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzYWRobGF3dXpmZWZzaXp5aHVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ3NDYwMCwiZXhwIjoyMDkzMDUwNjAwfQ.AYh_AZtPpimAnZLGjiUyXYgPPH4nVMq3JHR8wAL3RMw';

async function syncStock() {
    console.log('🚀 Starting Bulletproof Stock Sync...');
    
    const oldClient = createClient(oldUrl, oldKey);
    const newClient = createClient(newUrl, newKey);

    // 1. Fetch products from Old project
    const { data: oldProducts, error: oldErr } = await oldClient
        .from('products')
        .select('id, name, stock, low_stock_threshold');

    if (oldErr) {
        console.error('❌ Error fetching old products:', oldErr.message);
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

    console.log('✨ Sync Complete! Your website is now in sync with the latest counts.');
}

syncStock();
