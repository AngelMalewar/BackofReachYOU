// This is a simplified Node.js environment file (e.g., Vercel/Netlify)

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Environment variables that must be set in your Vercel/Netlify project:
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL; // e.g., https://xyz.supabase.co
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Service Role Key (CRITICAL)

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const payload = req.body;
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = JSON.stringify(payload); // Node.js environments often require raw body for verification

    // 1. 🛑 SECURITY CHECK: Verify the Razorpay signature
    try {
        const expectedSignature = crypto
            .createHmac('sha256', WEBHOOK_SECRET)
            .update(rawBody)
            .digest('hex');

        if (expectedSignature !== signature) {
            return res.status(403).json({ error: 'Invalid signature' });
        }
    } catch (err) {
        console.error('Signature verification error:', err);
        return res.status(500).json({ error: 'Internal verification error' });
    }

    // 2. Process the captured payment event
    if (payload.event === 'payment.captured' && payload.payload.payment.entity.status === 'captured') {
        const razorpayNotes = payload.payload.payment.entity.notes;
        const supabaseUserId = razorpayNotes?.user_id;

        if (!supabaseUserId) {
            return res.status(400).json({ error: 'Missing Supabase User ID in notes' });
        }

        // 3. Call the Supabase Postgres function to update the status
        try {
            // Use the RPC method to call the Postgres function
            const { error } = await supabaseAdmin.rpc('set_premium_status', {
                user_id: supabaseUserId // Argument name MUST match the function parameter name
            });

            if (error) throw error;

            return res.status(200).json({ success: true, user: supabaseUserId });

        } catch (error) {
            console.error(`Database update failed for user ${supabaseUserId}:`, error);
            return res.status(500).json({ error: 'Database update failed' });
        }
    }

    return res.status(200).json({ received: true });
}