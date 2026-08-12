'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Show, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils'

const navItems = [
    { label: 'Library', href: '/library' },
    { label: 'Add New', href: '/books/new' },
];

function Navbar() {
    const pathName = usePathname();
    const {user} = useUser();

    return (
        <header className="w-full top-0 left-0 fixed z-50 bg-(--bg-primary)">
            <div className="wrapper navbar-height py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-0.5">
                    <Image
                        src="/assets/logo.png"
                        alt="Bookified"
                        width={42}
                        height={26}
                    />
                    <span className="Logo-text font-bold">Bookified</span>
                </Link>

                <nav className="w-fit flex gap-7.5 items-center">
                    {navItems.map(({ label, href }) => {
                        const isActive =
                            pathName === href ||
                            (href !== '/' && pathName.startsWith(href));

                        return (
                            <Link
                                href={href}
                                key={label}
                                className={cn('nav-link-base', isActive ? 'nav-link-active': 'text-black hover:opacity-70')}
                            >
                                {label}
                            </Link>
                        );
                    })}

                    <div className="flex items-center gap-2">
                        <Show when="signed-out">
                            <SignInButton>
                                <button type="button" className="nav-btn px-3 py-2">
                                    Sign in
                                </button>
                            </SignInButton>
                            <SignUpButton>
                                <button type="button" className="btn-primary px-4 py-2 text-sm">
                                    Get started
                                </button>
                            </SignUpButton>
                        </Show>
                        <Show when="signed-in">
                            <UserButton />
                            {user?.firstName && (
                                <Link href="/subscriptions" className="nav-user-name">
                                    {user.firstName}
                                </Link>
                            )}
                        </Show>
                    </div>
                </nav>
            </div>
        </header>
    );
}

export default Navbar;
