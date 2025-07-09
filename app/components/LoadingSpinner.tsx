"use client";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  showProgress?: boolean;
  progress?: number;
}

export function LoadingSpinner({ 
  size = "md", 
  text = "Chargement...", 
  showProgress = false, 
  progress = 0 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-16 h-16"
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        {/* Main spinner */}
        <div className={`${sizeClasses[size]} ai-pulse`}>
          <div className={`${sizeClasses[size]} bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center`}>
            <span className="text-white font-bold">
              {size === "sm" ? "🤖" : size === "md" ? "🤖" : "🤖"}
            </span>
          </div>
        </div>
        
        {/* Orbiting dots */}
        <div className="absolute inset-0 animate-spin">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          </div>
          <div className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
            <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
          </div>
          <div className="absolute top-1/2 left-0 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
          </div>
        </div>
      </div>
      
      {/* Text */}
      <div className="text-center space-y-2">
        <p className="text-lg font-medium">{text}</p>
        {showProgress && (
          <div className="w-48 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
} 