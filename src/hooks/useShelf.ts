import { useContext } from "react";
import { ShelfContext, type ShelfContextType } from "@/context/shelf_init";

export function useShelf(): ShelfContextType {
  const context = useContext(ShelfContext);
  if (!context) {
    throw new Error("useShelf must be used within an ShelfProvider");
  }
  return context;
}
