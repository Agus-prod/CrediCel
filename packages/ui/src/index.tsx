import type { ButtonHTMLAttributes, ReactNode } from "react";
export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) { return <button {...props} />; }
export function EmptyState({ children }: { readonly children: ReactNode }) { return <div role="status">{children}</div>; }
