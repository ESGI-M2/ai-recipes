"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Clock, ChefHat } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "info";
}

export function StatsCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend, 
  variant = "default" 
}: StatsCardProps) {
  const variantClasses = {
    default: "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200",
    success: "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200",
    warning: "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200",
    info: "bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200"
  };

  const iconClasses = {
    default: "text-blue-600",
    success: "text-green-600",
    warning: "text-yellow-600",
    info: "text-purple-600"
  };

  return (
    <Card className={`modern-card hover-lift transition-all duration-300 ${variantClasses[variant]}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {icon && (
            <div className={`p-2 rounded-lg bg-white/50 ${iconClasses[variant]}`}>
              {icon}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold gradient-text">
              {value}
            </span>
            {trend && (
              <Badge 
                variant={trend.isPositive ? "default" : "destructive"} 
                className="text-xs"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                {trend.isPositive ? "+" : ""}{trend.value}%
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Predefined stats cards for common use cases
export function AIStatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Recettes générées"
        value="1,234"
        description="Total des recettes créées par l'IA"
        icon={<ChefHat className="w-4 h-4" />}
        trend={{ value: 12, isPositive: true }}
        variant="success"
      />
      <StatsCard
        title="Utilisateurs actifs"
        value="567"
        description="Utilisateurs ayant généré des recettes"
        icon={<Users className="w-4 h-4" />}
        trend={{ value: 8, isPositive: true }}
        variant="info"
      />
      <StatsCard
        title="Temps moyen"
        value="2.3s"
        description="Temps de génération moyen par recette"
        icon={<Clock className="w-4 h-4" />}
        trend={{ value: 5, isPositive: false }}
        variant="warning"
      />
      <StatsCard
        title="Taux de satisfaction"
        value="94%"
        description="Utilisateurs satisfaits des recettes"
        icon={<TrendingUp className="w-4 h-4" />}
        trend={{ value: 3, isPositive: true }}
        variant="default"
      />
    </div>
  );
} 