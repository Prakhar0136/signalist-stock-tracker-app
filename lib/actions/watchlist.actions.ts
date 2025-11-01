'use server';

import { connectToDatabase } from '@/database/mongoose';  
import { revalidatePath } from 'next/cache';
import { auth } from '../better-auth/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Watchlist } from '@/database/models/watchlist.model';

export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
  if (!email) return [];

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection not found');

    // Better Auth stores users in the "user" collection
    const user = await db.collection('user').findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

    if (!user) return [];

    const userId = (user.id as string) || String(user._id || '');
    if (!userId) return [];

    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    return items.map((i) => String(i.symbol));
  } catch (err) {
    console.error('getWatchlistSymbolsByEmail error:', err);
    return [];
  }
}

// Add stock to watchlist
export const addToWatchlist = async (symbol: string, company: string) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) redirect('/sign-in');

    // Check if stock already exists in watchlist
    const existingItem = await Watchlist.findOne({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
    });

    if (existingItem) {
      return { success: false, error: 'Stock already in watchlist' };
    }

    // Add to watchlist
    const newItem = new Watchlist({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
      company: company.trim(),
    });

    await newItem.save();
    revalidatePath('/watchlist');

    return { success: true, message: 'Stock added to watchlist' };
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    throw new Error('Failed to add stock to watchlist');
  }
};

// Remove stock from watchlist
export const removeFromWatchlist = async (symbol: string) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) redirect('/sign-in');

    // Remove from watchlist
    await Watchlist.deleteOne({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
    });
    revalidatePath('/watchlist');

    return { success: true, message: 'Stock removed from watchlist' };
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    throw new Error('Failed to remove stock from watchlist');
  }
};

// Get user's watchlist
export const getUserWatchlist = async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) redirect('/sign-in');

    const watchlist = await Watchlist.find({ userId: session.user.id })
      .sort({ addedAt: -1 })
      .lean();

    return JSON.parse(JSON.stringify(watchlist));
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    throw new Error('Failed to fetch watchlist');
  }
}

// Get watchlist with company data from Finnhub
export async function getWatchlistWithData() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) redirect('/sign-in');

    // Fetch user’s saved watchlist items from DB
    const watchlist = await Watchlist.find({ userId: session.user.id })
      .sort({ addedAt: -1 })
      .lean();

    if (!watchlist.length) return [];

    // Get stock symbols from the watchlist
    const symbols = watchlist.map((item) => item.symbol);

    // Dynamically import to avoid circular dependency
    const { searchStocks } = await import('@/lib/actions/finnhub.actions');

    // Fetch stock data for these symbols (searchStocks can handle batching)
    const stockData = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const data = await searchStocks(symbol);
          return data?.[0] || { symbol, name: symbol, price: null };
        } catch (err) {
          console.error(`Error fetching data for ${symbol}:`, err);
          return { symbol, name: symbol, price: null };
        }
      })
    );

    // Merge watchlist DB data with fetched stock info
    const combined = watchlist.map((item, idx) => ({
      ...item,
      ...stockData[idx],
    }));

    return JSON.parse(JSON.stringify(combined));
  } catch (error) {
    console.error('Error fetching watchlist with data:', error);
    return [];
  }
}
