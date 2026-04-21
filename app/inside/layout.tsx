import { InsideShell } from "@/components/shell/InsideShell";

export default function InsideLayout({ children }: { children: React.ReactNode }) {
  return <InsideShell>{children}</InsideShell>;
}
