import Link from "next/link"

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <div className="mx-auto max-w-md text-center">
                <div className="mb-6 text-7xl font-bold text-muted-foreground/30">
                    404
                </div>
                <h1 className="mb-2 text-2xl font-bold text-foreground">
                    Page not found
                </h1>
                <p className="mb-6 text-muted-foreground">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                    Go home
                </Link>
            </div>
        </div>
    )
}
