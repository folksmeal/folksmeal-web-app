export type MealPreference = "VEG" | "NONVEG"
export type SelectionStatus = "OPT_IN" | "OPT_OUT"

export type ExistingMealRating = { rating: number; comment: string | null } | null

export type ConfirmationAddonItem = {
    addon: { name: string }
    quantity: number
    priceAtSelection: number
}

export type ConfirmationScreenProps = {
    employeeCode: string
    status: SelectionStatus
    preference: MealPreference | null
    updatedAt: string
    mealDate: string
    existingRating?: ExistingMealRating
    promptRating?: boolean
    addons?: ConfirmationAddonItem[]
}

export type EmployeeDashboardSessionUser = {
    id: string
    name: string | null
    role: string
    addressId: string
    employeeCode: string
    companyName: string
    companyIcon?: string | null
    addressCity: string
    locationTimezone: string
}

