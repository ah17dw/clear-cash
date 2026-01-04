import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSubExpenses, useCreateSubExpense, useDeleteSubExpense } from '@/hooks/useSubExpenses';
import { ExpenseItem } from '@/types/finance';
import { AmountDisplay } from '@/components/ui/amount-display';

interface SubExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseItem;
}

export function SubExpenseSheet({ open, onOpenChange, expense }: SubExpenseSheetProps) {
  const { data: subExpenses, isLoading } = useSubExpenses(expense.id);
  const createSubExpense = useCreateSubExpense();
  const deleteSubExpense = useDeleteSubExpense();

  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    
    await createSubExpense.mutateAsync({
      parent_expense_id: expense.id,
      name: newName.trim(),
      monthly_amount: parseFloat(newAmount) || 0,
    });
    
    setNewName('');
    setNewAmount('');
  };

  const totalSubExpenses = subExpenses?.reduce((sum, s) => sum + Number(s.monthly_amount), 0) ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Sub-expenses for {expense.name}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Parent amount:</span>
            <AmountDisplay amount={Number(expense.monthly_amount)} size="sm" />
          </div>
          
          {totalSubExpenses > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sub-expenses total:</span>
              <AmountDisplay amount={totalSubExpenses} size="sm" />
            </div>
          )}

          <div className="border-t pt-4">
            <Label className="text-sm font-medium">Add Sub-expense</Label>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Name (e.g., Electric)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Amount"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-24"
                step="0.01"
              />
              <Button
                size="icon"
                onClick={handleAdd}
                disabled={!newName.trim() || createSubExpense.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : subExpenses && subExpenses.length > 0 ? (
              subExpenses.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold">
                      {sub.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm">{sub.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AmountDisplay amount={Number(sub.monthly_amount)} size="sm" />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteSubExpense.mutate({ id: sub.id, parent_expense_id: expense.id })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sub-expenses yet. Add items like Water, Electric, etc.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
