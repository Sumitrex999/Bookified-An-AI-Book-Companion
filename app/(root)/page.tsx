import { auth } from '@clerk/nextjs/server';

import HeroSection from '@/components/HeroSection';
import BookCard from '@/components/BookCard';
import { getAllBooks } from '@/lib/actions/book.actions';

const Page = async () => {
  const { userId } = await auth();

  if (!userId) {
    return (
      <main className="wrapper container">
        <HeroSection />
        <div className="library-books-grid">
          <p className="text-sm text-muted-foreground">Please sign in to view your library.</p>
        </div>
      </main>
    );
  }

  const bookResults = await getAllBooks();
  const books = bookResults.success ? (bookResults.data ?? []) : [];

  return (
    <main className="wrapper container">
      <HeroSection />

      <div className="library-books-grid">
        {books.map((book) => (
          <BookCard key={book._id} title={book.title} author={book.author} coverURL={book.coverURL} slug={book.slug} />
        ))}
      </div>
    </main>
  );
};

export default Page;
