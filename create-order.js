// This file assumes a Node.js serverless environment (e.g., Netlify/Vercel)
import Razorpay from 'razorpay';

// You MUST set these environment variables in Netlify
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID; 
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET; // This is different from the WEBHOOK secret

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Expecting amount and currency from the client
  const { amount, currency, userId } = req.body; 

  if (!amount || !currency || !userId) {
    return res.status(400).json({ error: 'Missing amount, currency, or userId' });
  }
  
  try {
    const options = {
      amount: amount, // Amount in smallest unit (e.g., 79900 for ₹799)
      currency: currency, 
      receipt: `receipt_${userId}_${Date.now()}`, // Unique receipt for tracking
      notes: {
          user_id: userId, // Pass the user ID to the order
      }
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({ success: true, orderId: order.id });
    
  } catch (error) {
    console.error('Razorpay Order Creation Failed:', error);
    return res.status(500).json({ error: 'Failed to create Razorpay Order' });
  }
}
