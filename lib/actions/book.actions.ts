'use server';

import { auth } from '@clerk/nextjs/server';

import { CreateBook, TextSegment } from '@/types';
import { connectToDatabase } from '@/database/mongoose';
import { generateSlug, serializeData } from '@/lib/utils';
import Book from '@/database/models/book.model';
import BookSegment from '@/database/models/book-segment.model';

export const getAllBooks = async () => {
    try {
        const { userId } = await auth();

        if (!userId) {
            return {
                success: false,
                error: 'Unauthorized',
            };
        }

        await connectToDatabase();

        const books = await Book.find({ clerkId: userId }).sort({ createdAt: -1 }).lean();

        return {
            success: true,
            data: serializeData(books),
        };
    } catch (e) {
        console.error('Error connecting to database', e);
        return {
            success: false,
            error: e,
        };
    }
};

export const checkBookExists = async (title: string) => {
    try {
        const { userId } = await auth();

        if (!userId) {
            return {
                exists: false,
                error: 'Unauthorized',
            };
        }

        await connectToDatabase();

        const slug = generateSlug(title);
        const existingBook = await Book.findOne({ clerkId: userId, slug }).lean();

        if (existingBook) {
            return {
                exists: true,
                book: serializeData(existingBook),
            };
        }

        return {
            exists: false,
        };
    } catch (e) {
        console.error('Error checking book exists', e);
        return {
            exists: false,
            error: e,
        };
    }
};

export const createBook = async (data: Omit<CreateBook, 'clerkId'>) => {
    try {
        const { userId } = await auth();

        if (!userId) {
            return {
                success: false,
                error: 'Unauthorized',
            };
        }

        await connectToDatabase();

        const slug = generateSlug(data.title);
        const existingBook = await Book.findOne({ clerkId: userId, slug }).lean();

        if (existingBook) {
            return {
                success: true,
                data: serializeData(existingBook),
                alreadyExists: true,
            };
        }

        // Todo: Check subscription limits before creating a new book

        const book = await Book.create({
            ...data,
            clerkId: userId,
            slug,
            totalSegments: 0,
        });

        return {
            success: true,
            data: serializeData(book),
        };
    } catch (e) {
        console.error('Error creating a book', e);
        return {
            success: false,
            error: e,
        };
    }
};

export const saveBookSegments = async (bookId: string, segments: TextSegment[]) => {
    try {
        const { userId } = await auth();

        if (!userId) {
            return {
                success: false,
                error: 'Unauthorized',
            };
        }

        await connectToDatabase();

        const book = await Book.findOne({ _id: bookId, clerkId: userId }).lean();

        if (!book) {
            return {
                success: false,
                error: 'Unauthorized',
            };
        }

        console.log('Saving book segments...');

        const segmentsToInsert = segments.map(({ text, segmentIndex, pageNumber, wordCount }) => ({
            clerkId: userId,
            bookId,
            content: text,
            segmentIndex,
            pageNumber,
            wordCount,
        }));

        await BookSegment.insertMany(segmentsToInsert);
        await Book.findOneAndUpdate(
            { _id: bookId, clerkId: userId },
            { $set: { totalSegments: segments.length } },
        );

        console.log('Book segments saved successfully.');

        return {
            success: true,
            data: { segmentsCreated: segments.length },
        };
    } catch (e) {
        console.error('Error saving book segments', e);

        await BookSegment.deleteMany({ bookId });
        await Book.findByIdAndDelete(bookId);
        console.log('Deleted book segments and book due to failure to save segments.');
        return {
            success: false,
            error: e,
        };
    }
};