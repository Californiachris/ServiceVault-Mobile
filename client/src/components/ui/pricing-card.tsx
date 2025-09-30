import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface PricingCardProps {
  name: string;
  price: number;
  period: "month" | "year" | "lifetime";
  description: string;
  features: string[];
  isPopular?: boolean;
  onSelect?: () => void;
}

export default function PricingCard({
  name,
  price,
  period,
  description,
  features,
  isPopular = false,
  onSelect,
}: PricingCardProps) {
  const formatPrice = () => {
    if (period === "lifetime") {
      return `$${price}`;
    }
    return `$${price}`;
  };

  const formatPeriod = () => {
    if (period === "lifetime") return "one-time";
    return `/${period}`;
  };

  return (
    <Card 
      className={`relative hover:border-primary/50 transition-colors ${
        isPopular ? 'border-2 border-primary' : ''
      }`}
      data-testid={`pricing-card-${name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">
            Most Popular
          </Badge>
        </div>
      )}
      
      <CardHeader className="text-center">
        <h3 className="text-xl font-bold mb-2">{name}</h3>
        <p className="text-muted-foreground text-sm mb-4">{description}</p>
        <div className="text-3xl font-bold">
          {formatPrice()}
          <span className="text-lg text-muted-foreground">
            {formatPeriod()}
          </span>
        </div>
      </CardHeader>
      
      <CardContent>
        <ul className="space-y-3 mb-8">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center text-sm">
              <Check className="text-green-400 mr-3 h-4 w-4 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        
        <Button 
          className={`w-full font-semibold ${
            isPopular 
              ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
              : ''
          }`}
          variant={isPopular ? "default" : "outline"}
          onClick={onSelect}
          data-testid={`button-select-plan-${name.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {period === "lifetime" ? "Purchase Now" : isPopular ? "Start Free Trial" : "Get Started"}
        </Button>
      </CardContent>
    </Card>
  );
}
