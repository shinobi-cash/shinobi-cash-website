import Image from "next/image";

interface SplashScreenProps {
  subtitle?: string;
}

export const SplashScreen = ({ subtitle }: SplashScreenProps) => (
  <div className="min-h-screen bg-app-background flex flex-col items-center justify-center px-2 py-2 sm:px-3 sm:py-3">
    <div className="text-center flex flex-col items-center">
      <div className="mb-3 animate-bounce">
        <Image
          src="/icon.svg"
          alt="Shinobi Cash"
          width={300}
          height={80}
          priority
        />
      </div>
      {subtitle && <p className="text-app-secondary text-lg animate-pulse">{subtitle}</p>}
    </div>
  </div>
);
