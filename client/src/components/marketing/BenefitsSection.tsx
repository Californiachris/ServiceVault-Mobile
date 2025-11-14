import { CheckCircle2 } from "lucide-react";

export interface MarketingBenefit {
  id: string;
  text: string;
}

interface BenefitsSectionProps {
  heading: string;
  eyebrow?: string;
  accentVariant?: "contractor" | "homeowner" | "fleet" | "property-manager";
  benefits: MarketingBenefit[];
  testIdPrefix: string;
}

const accentColors = {
  "contractor": "from-orange-500 to-red-500",
  "homeowner": "from-blue-500 to-cyan-500",
  "fleet": "from-purple-500 to-pink-500",
  "property-manager": "from-green-500 to-emerald-500",
};

export function BenefitsSection({
  heading,
  eyebrow,
  accentVariant = "contractor",
  benefits,
  testIdPrefix,
}: BenefitsSectionProps) {
  const accentGradient = accentColors[accentVariant];

  return (
    <div 
      className="mt-16 mb-16 max-w-4xl mx-auto"
      data-testid={`section-benefits-${testIdPrefix}`}
    >
      <div className="text-center mb-10">
        {eyebrow && (
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {eyebrow}
          </p>
        )}
        <h2 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${accentGradient} bg-clip-text text-transparent`}>
          {heading}
        </h2>
      </div>

      <ul className="space-y-4 max-w-3xl mx-auto">
        {benefits.map((benefit) => (
          <li
            key={benefit.id}
            className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors"
            data-testid={`item-benefit-${benefit.id}`}
          >
            <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
            <span className="text-base md:text-lg leading-relaxed">{benefit.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
