import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ToolCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  status: string;
  statusColor: "green" | "blue" | "purple" | "orange" | "cyan" | "red";
  href?: string;
}

const statusColorMap = {
  green: "bg-green-500/10 text-green-400 border-green-500/20",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function ToolCard({ 
  title, 
  description, 
  icon: Icon, 
  status, 
  statusColor,
  href 
}: ToolCardProps) {
  const content = (
    <Card className="hover:border-primary/50 transition-colors group h-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Icon className="text-primary h-6 w-6" />
          </div>
          <Badge 
            variant="outline" 
            className={`text-xs font-medium border ${statusColorMap[statusColor]}`}
          >
            {status}
          </Badge>
        </div>
        
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
          {description}
        </p>
        
        <Button 
          className="w-full font-medium" 
          size="sm"
          data-testid={`button-open-tool-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open Tool
        </Button>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} data-testid={`tool-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        {content}
      </Link>
    );
  }

  return content;
}
