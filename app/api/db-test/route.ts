import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/database/mongoose';

export async function GET() {
  try {
    await connectToDatabase();

    return NextResponse.json({
      success: true,
      message: 'MongoDB connected successfully',
    });
  } catch (error) {
    console.error('MONGODB TEST ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'MongoDB connection failed',
      },
      { status: 500 }
    );
  }
}