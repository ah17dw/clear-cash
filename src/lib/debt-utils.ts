/**
 * Calculate the adjusted balance assuming payments have been made
 * after the payment due date has passed each month.
 */
export function getAdjustedBalance(
  balance: number,
  paymentDay: number | null,
  monthlyPayment: number,
  createdAt: string
): { adjustedBalance: number; paymentsMade: number } {
  if (!paymentDay || monthlyPayment <= 0) {
    return { adjustedBalance: balance, paymentsMade: 0 };
  }

  const today = new Date();
  const createdDate = new Date(createdAt);
  
  // Count how many payment dates have passed since creation
  let paymentsMade = 0;
  let checkDate = new Date(createdDate.getFullYear(), createdDate.getMonth(), paymentDay);
  
  // If the debt was created after the payment day in that month, start from next month
  if (checkDate <= createdDate) {
    checkDate = new Date(createdDate.getFullYear(), createdDate.getMonth() + 1, paymentDay);
  }
  
  // Count each payment date that has passed
  while (checkDate <= today) {
    paymentsMade++;
    checkDate = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, paymentDay);
  }
  
  // Calculate adjusted balance (don't go below 0)
  const adjustedBalance = Math.max(0, balance - (paymentsMade * monthlyPayment));
  
  return { adjustedBalance, paymentsMade };
}
