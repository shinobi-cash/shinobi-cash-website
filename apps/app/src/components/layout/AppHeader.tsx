import Image from "next/image";
import { AppMenu } from "../features/app/AppMenu";

export const AppHeader = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-app-border py-2 px-3 sm:py-3 sm:px-4 md:px-6 bg-app-surface">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex-1" />
        <div className="flex items-center justify-center">
          <Image
            src="/Shinobi.Cash-white-text.png"
            alt="Shinobi Cash"
            width={180}
            height={40}
            className="h-8 sm:h-10 w-auto"
            priority
          />
        </div>
        <div className="flex-1 flex justify-end">
          <AppMenu />
        </div>
      </div>
    </header>
  );
};
