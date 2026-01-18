import { useState } from 'react';
import { ExternalLink, ShieldCheck, TrendingUp, AlertCircle, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCreditReport } from '@/hooks/useCreditReport';
import { CreditScoreFormSheet } from '@/components/credit/CreditScoreFormSheet';
import { format } from 'date-fns';

interface CreditScoreCardProps {
  className?: string;
}

export function CreditScoreCard({ className }: CreditScoreCardProps) {
  const { latestScore, scoreHistory, addScore, creditEntries } = useCreditReport();
  const [showScoreForm, setShowScoreForm] = useState(false);
  
  const maxScore = 999;
  const score = latestScore?.score || 0;
  const scorePercentage = (score / maxScore) * 100;
  
  const getScoreRating = (score: number) => {
    if (score >= 881) return { label: 'Excellent', color: 'text-savings' };
    if (score >= 721) return { label: 'Good', color: 'text-primary' };
    if (score >= 561) return { label: 'Fair', color: 'text-yellow-500' };
    return { label: 'Poor', color: 'text-debt' };
  };

  // Calculate score change
  const previousScore = scoreHistory && scoreHistory.length > 1 ? scoreHistory[1]?.score : null;
  const scoreChange = previousScore ? score - previousScore : null;

  const handleAddScore = (data: any) => {
    addScore.mutate(data);
  };

  if (!latestScore) {
    return (
      <>
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
                Track your credit score from Experian
              </p>
              <Button size="sm" variant="default" className="gap-2" onClick={() => setShowScoreForm(true)}>
                <Plus className="h-3 w-3" />
                Record Score
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Check your score on Experian then record it here to track over time
            </p>
          </CardContent>
        </Card>
        <CreditScoreFormSheet
          open={showScoreForm}
          onOpenChange={setShowScoreForm}
          onSubmit={handleAddScore}
        />
      </>
    );
  }

  const rating = getScoreRating(score);

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Credit Score
            </CardTitle>
            <div className="flex items-center gap-2">
              {scoreChange !== null && (
                <Badge variant="outline" className="text-xs">
                  <TrendingUp className={`h-3 w-3 mr-1 ${scoreChange >= 0 ? 'text-savings' : 'text-debt'}`} />
                  {scoreChange >= 0 ? '+' : ''}{scoreChange}
                </Badge>
              )}
              <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setShowScoreForm(true)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-3xl font-bold ${rating.color}`}>{score}</p>
              <p className="text-xs text-muted-foreground">out of {maxScore}</p>
            </div>
            <Badge className={rating.color}>{rating.label}</Badge>
          </div>
          
          <Progress value={scorePercentage} className="h-2" />
          
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Credit Entries</p>
              <p className="text-sm font-medium">{creditEntries?.filter(e => e.account_status === 'open').length || 0} open</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Updated</p>
              <p className="text-sm font-medium">
                {format(new Date(latestScore.recorded_at), 'dd MMM')}
              </p>
            </div>
          </div>
          
          <Button size="sm" variant="ghost" className="w-full text-xs gap-2" asChild>
            <a href="https://www.experian.co.uk" target="_blank" rel="noopener noreferrer">
              Check on Experian
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </CardContent>
      </Card>
      <CreditScoreFormSheet
        open={showScoreForm}
        onOpenChange={setShowScoreForm}
        onSubmit={handleAddScore}
      />
    </>
  );
}
