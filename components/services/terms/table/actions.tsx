import { DeleteTerm } from "@/actions/terms";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import {
    MoreHorizontal,
    Pencil,
    Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { termsKeys } from "../../util";
import { Button } from "@/components/ui/button";

interface TermsActionProps {
    term: {
        id: string
        isDefault: boolean
        isActive: boolean
    }
}

export function TermsActions({ term }: TermsActionProps) {
    const queryClient = useQueryClient();
    const handleDelete = async () => {
        try {
            const response = await DeleteTerm(term.id);

            if (response.success) {
                toast.success(response.message);
                queryClient.invalidateQueries({
                    queryKey: termsKeys.all,
                });
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error("Something went wrong");
            console.error(error);
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                >
                    <MoreHorizontal />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <Link href={`/dashboard/terms/${term.id}/edit`}>
                        <Pencil />
                        Edit
                    </Link>
                </DropdownMenuItem>

                {/* <DropdownMenuItem onClick={handleDuplicate}>
                <CopyPlus />
                Duplicate
            </DropdownMenuItem> */}
                {/* 
            {!term.isDefault && (
                <DropdownMenuItem onClick={handleSetDefault}>
                    <Star />
                    Set as Default
                </DropdownMenuItem>
            )} */}

                {/* <DropdownMenuSeparator /> */}

                {/* <DropdownMenuItem onClick={handleToggleStatus}> */}
                {/* {term.isActive ? (
                    <>
                        <EyeOff />
                        Deactivate
                    </>
                ) : (
                    <>
                        <Eye />
                        Activate
                    </>
                )} */}
                {/* </DropdownMenuItem> */}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleDelete}
                >
                    <Trash2 />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}