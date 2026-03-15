'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SearchInputProps extends React.ComponentProps<typeof Input> {
    onClear?: () => void
}

function SearchInput({ className, value, onChange, onClear, ...props }: SearchInputProps) {
    const hasValue = !!value && String(value).length > 0

    return (
        <div className="relative w-full group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground">
                <Search className="size-4 shrink-0" />
            </div>
            <Input
                type="text"
                value={value}
                onChange={onChange}
                className={cn(
                    "pl-9 pr-9 transition-all",
                    className
                )}
                {...props}
            />
            {hasValue && onClear && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-transparent"
                    onClick={() => {
                        onClear()
                    }}
                >
                    <X className="size-3.5" />
                    <span className="sr-only">Clear search</span>
                </Button>
            )}
        </div>
    )
}

export { SearchInput }
