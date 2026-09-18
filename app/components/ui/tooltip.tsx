"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md border border-bg-border bg-bg-surface2 px-2 py-1 text-xs text-foreground shadow-md",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/**
 * Dica curta que aparece na hora ao passar o mouse, para botões só de ícone.
 *
 * O `title` nativo resolveria, mas o navegador o mostra com atraso fixo, que
 * não dá para ajustar. Traz o próprio provedor, com atraso zero, para não
 * depender de um no layout.
 */
function Dica({
  texto,
  lado = "bottom",
  children,
}: {
  texto: string;
  lado?: "top" | "right" | "bottom" | "left";
  /** Um único elemento que aceite ref — o botão ou link. */
  children: React.ReactElement;
}) {
  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={lado}>{texto}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, Dica };
