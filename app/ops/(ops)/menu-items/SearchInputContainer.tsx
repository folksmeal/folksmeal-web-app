'use client'

import { useState, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { SearchInput } from "@/components/ui/search-input"

export function SearchInputContainer({ initialQuery }: { initialQuery: string }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [query, setQuery] = useState(initialQuery)

    useEffect(() => {
        const handler = setTimeout(() => {
            if (query !== initialQuery) {
                const params = new URLSearchParams(searchParams.toString())
                if (query) {
                    params.set("q", query)
                } else {
                    params.delete("q")
                }
                params.set("page", "1")
                router.replace(`${pathname}?${params.toString()}`, { scroll: false })
            }
        }, 300)

        return () => clearTimeout(handler)
    }, [query, initialQuery, pathname, router, searchParams])

    return (
        <SearchInput
            placeholder="Search items..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
        />
    )
}
