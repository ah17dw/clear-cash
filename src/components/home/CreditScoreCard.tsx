import { useState } from 'react';
import { ExternalLink, ShieldCheck, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface CreditScoreCardProps {
  className?: string;
}

export function CreditScoreCard({ className }: CreditScoreCardProps) {
  // This would be connected to actual Experian API once configured
  const [isConnected] = useState(false);
  
  // Placeholder data - would come from Experian API
  const mockScore = 742;
  const maxScore = 999;
  const scorePercentage = (mockScore / maxScore) * 100;
  
  const getScoreRating = (score: number) => {
    if (score >= 881) return { label: 'Excellent', color: 'text-savings' };
    if (score >= 721) return { label: 'Good', color: 'text-primary' };
    if (score >= 561) return { label: 'Fair', color: 'text-yellow-500' };
    return { label: 'Poor', color: 'text-debt' };
  };

  if (!isConnected) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Credit Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Connect to Experian to see your credit score and card balances
            </p>
            <Button size="sm" variant="outline" className="gap-2" asChild>
              <a href="https://www.experian.co.uk" target="_blank" rel="noopener noreferrer">
                Connect Experian
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Experian integration requires OAuth setup via their Developer Portal
          </p>
        </CardContent>
      </Card>
    );
  }

  const rating = getScoreRating(mockScore);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Credit Score
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            <TrendingUp className="h-3 w-3 mr-1" />
            +12 this month
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-3xl font-bold ${rating.color}`}>{mockScore}</p>
            <p className="text-xs text-muted-foreground">out of {maxScore}</p>
          </div>
          <Badge className={rating.color}>{rating.label}</Badge>
        </div>
        
        <Progress value={scorePercentage} className="h-2" />
        
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Credit Cards</p>
            <p className="text-sm font-medium">4 active</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Credit Used</p>
            <p className="text-sm font-medium">32%</p>
          </div>
        </div>
        
        <Button size="sm" variant="ghost" className="w-full text-xs gap-2" asChild>
          <a href="https://www.experian.co.uk" target="_blank" rel="noopener noreferrer">
            View Full Report
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
