import { Schema, model, models } from "mongoose";
import { IBookSegment } from "@/types";

const BookSegmentSchema = new Schema<IBookSegment>({
    clerkId: {type: String, required: true},
    bookId: {type: Schema.Types.ObjectId, ref: "Book", required: true, index: true},
    content: {type: String, required: true},
    segmentIndex: {type: Number, required: true, index: true},
    pageNumber: {type: Number, index: true},
    wordCount: {type: Number, required: true},
}, {timestamps: true});

// CLean Code Book -> Learn about atomic Functions -> segment -> Dive Deeper.
//  Instead of storing the entire book content in a single document, we can break it down into smaller segments. Each segment can be stored as a separate document in the database, allowing for more efficient retrieval and manipulation of the book's content. This approach also enables us to easily add, remove, or update individual segments without affecting the entire book.

BookSegmentSchema.index({ bookId: 1, segmentIndex: 1 }, { unique: true });
BookSegmentSchema.index({bookId: 1, pageNumber: 1});

BookSegmentSchema.index({ bookId: 1, content: 'text'});

const BookSegment = models.BookSegment || model<IBookSegment>('BookSegment', BookSegmentSchema);

export default BookSegment;
