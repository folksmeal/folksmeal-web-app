/**
 * Standard SWR fetcher that handles our API error format { error, code, details }.
 */
export async function fetcher<T>(url: string): Promise<T> {
    const res = await fetch(url)

    if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }))
        const error = new Error(data.error || "An error occurred while fetching the data.") as Error & { info?: unknown; status?: number }
        error.info = data
        error.status = res.status
        throw error
    }

    return res.json()
}
