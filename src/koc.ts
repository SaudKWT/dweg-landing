/**
 * The KOC Design System, as installed here from the @koc registry.
 *
 * The landing pages were written inside the design-system monorepo against
 * `@koc/ui`. In this consumer repo those components are local files owned by
 * this app (`npx shadcn add @koc/...`), so this barrel gives the pages the same
 * names from the installed copies. To update one: re-run `shadcn add` for it.
 */
export { Badge } from "@/components/ui/badge";
export { Button } from "@/components/ui/button";
export { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
export { StatCard, type StatIntent } from "@/components/ui/stat-card";
export { Toaster } from "@/components/ui/sonner";
export { toast } from "@/components/ui/sonner";
export { cn } from "@/lib/utils";
export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
export { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
