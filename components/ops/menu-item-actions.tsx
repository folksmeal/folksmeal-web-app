"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2, Pencil } from "lucide-react"
import { deleteMenuItem } from "@/app/actions/menu-items"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { MenuItemEditDialog } from "./menu-item-edit-dialog"

export function MenuItemActions({ id, name, description }: { id: string; name: string; description?: string | null }) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            await deleteMenuItem(id)
            toast.success("Menu item deleted")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete item")
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="flex items-center justify-end gap-2">
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                onClick={() => setIsEditOpen(true)}
            >
                <Pencil className="h-4 w-4" />
            </Button>

            <MenuItemEditDialog
                item={{ id, name, description }}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
            />

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Menu Item?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{name}</strong>? This will remove descriptions from any existing menus that use this item, but the menus themselves will not be deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleDelete()
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

