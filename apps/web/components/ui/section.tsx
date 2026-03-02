import { cn } from "@workspace/ui/lib/utils";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function Section({ children, className, id }: SectionProps) {
  return (
    <section
      id={id}
      className={cn("px-4 py-16 sm:px-6 sm:py-20 md:py-24 lg:px-8 lg:py-32", className)}
    >
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
}

export function SectionHeader({ title, subtitle, centered = true, className }: SectionHeaderProps) {
  return (
    <div className={cn("mb-12 sm:mb-16", centered && "text-center", className)}>
      <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl md:text-4xl">{title}</h2>
      {subtitle && (
        <p className="mx-auto max-w-2xl text-base text-neutral-400 sm:text-lg">{subtitle}</p>
      )}
    </div>
  );
}
