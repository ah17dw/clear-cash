-- Complete the authorization fix by adding is_authorized() check to all RLS policies
-- This ensures server-side enforcement of the authorized_users list

-- ============================================
-- DEBTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view their own debts" ON public.debts;
DROP POLICY IF EXISTS "Users can create their own debts" ON public.debts;
DROP POLICY IF EXISTS "Users can update their own debts" ON public.debts;
DROP POLICY IF EXISTS "Users can delete their own debts" ON public.debts;

CREATE POLICY "Authorized users can view their own debts"
ON public.debts FOR SELECT
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can create their own debts"
ON public.debts FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can update their own debts"
ON public.debts FOR UPDATE
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can delete their own debts"
ON public.debts FOR DELETE
USING (auth.uid() = user_id AND public.is_authorized());

-- ============================================
-- DEBT_PAYMENTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view their own debt payments" ON public.debt_payments;
DROP POLICY IF EXISTS "Users can create their own debt payments" ON public.debt_payments;
DROP POLICY IF EXISTS "Users can update their own debt payments" ON public.debt_payments;
DROP POLICY IF EXISTS "Users can delete their own debt payments" ON public.debt_payments;

CREATE POLICY "Authorized users can view their own debt payments"
ON public.debt_payments FOR SELECT
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can create their own debt payments"
ON public.debt_payments FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can update their own debt payments"
ON public.debt_payments FOR UPDATE
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can delete their own debt payments"
ON public.debt_payments FOR DELETE
USING (auth.uid() = user_id AND public.is_authorized());

-- ============================================
-- EXPENSE_ITEMS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view their own expense items" ON public.expense_items;
DROP POLICY IF EXISTS "Users can create their own expense items" ON public.expense_items;
DROP POLICY IF EXISTS "Users can update their own expense items" ON public.expense_items;
DROP POLICY IF EXISTS "Users can delete their own expense items" ON public.expense_items;

CREATE POLICY "Authorized users can view their own expense items"
ON public.expense_items FOR SELECT
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can create their own expense items"
ON public.expense_items FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can update their own expense items"
ON public.expense_items FOR UPDATE
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can delete their own expense items"
ON public.expense_items FOR DELETE
USING (auth.uid() = user_id AND public.is_authorized());

-- ============================================
-- SUB_EXPENSES TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view their own sub-expenses" ON public.sub_expenses;
DROP POLICY IF EXISTS "Users can create their own sub-expenses" ON public.sub_expenses;
DROP POLICY IF EXISTS "Users can update their own sub-expenses" ON public.sub_expenses;
DROP POLICY IF EXISTS "Users can delete their own sub-expenses" ON public.sub_expenses;

CREATE POLICY "Authorized users can view their own sub-expenses"
ON public.sub_expenses FOR SELECT
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can create their own sub-expenses"
ON public.sub_expenses FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can update their own sub-expenses"
ON public.sub_expenses FOR UPDATE
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can delete their own sub-expenses"
ON public.sub_expenses FOR DELETE
USING (auth.uid() = user_id AND public.is_authorized());

-- ============================================
-- INCOME_SOURCES TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view their own income sources" ON public.income_sources;
DROP POLICY IF EXISTS "Users can create their own income sources" ON public.income_sources;
DROP POLICY IF EXISTS "Users can update their own income sources" ON public.income_sources;
DROP POLICY IF EXISTS "Users can delete their own income sources" ON public.income_sources;

CREATE POLICY "Authorized users can view their own income sources"
ON public.income_sources FOR SELECT
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can create their own income sources"
ON public.income_sources FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can update their own income sources"
ON public.income_sources FOR UPDATE
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can delete their own income sources"
ON public.income_sources FOR DELETE
USING (auth.uid() = user_id AND public.is_authorized());

-- ============================================
-- SAVINGS_ACCOUNTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view their own savings accounts" ON public.savings_accounts;
DROP POLICY IF EXISTS "Users can create their own savings accounts" ON public.savings_accounts;
DROP POLICY IF EXISTS "Users can update their own savings accounts" ON public.savings_accounts;
DROP POLICY IF EXISTS "Users can delete their own savings accounts" ON public.savings_accounts;

CREATE POLICY "Authorized users can view their own savings accounts"
ON public.savings_accounts FOR SELECT
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can create their own savings accounts"
ON public.savings_accounts FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can update their own savings accounts"
ON public.savings_accounts FOR UPDATE
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can delete their own savings accounts"
ON public.savings_accounts FOR DELETE
USING (auth.uid() = user_id AND public.is_authorized());

-- ============================================
-- SAVINGS_TRANSACTIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view their own savings transactions" ON public.savings_transactions;
DROP POLICY IF EXISTS "Users can create their own savings transactions" ON public.savings_transactions;
DROP POLICY IF EXISTS "Users can update their own savings transactions" ON public.savings_transactions;
DROP POLICY IF EXISTS "Users can delete their own savings transactions" ON public.savings_transactions;

CREATE POLICY "Authorized users can view their own savings transactions"
ON public.savings_transactions FOR SELECT
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can create their own savings transactions"
ON public.savings_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can update their own savings transactions"
ON public.savings_transactions FOR UPDATE
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can delete their own savings transactions"
ON public.savings_transactions FOR DELETE
USING (auth.uid() = user_id AND public.is_authorized());

-- ============================================
-- RENEWALS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view their own renewals" ON public.renewals;
DROP POLICY IF EXISTS "Users can create their own renewals" ON public.renewals;
DROP POLICY IF EXISTS "Users can update their own renewals" ON public.renewals;
DROP POLICY IF EXISTS "Users can delete their own renewals" ON public.renewals;

CREATE POLICY "Authorized users can view their own renewals"
ON public.renewals FOR SELECT
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can create their own renewals"
ON public.renewals FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can update their own renewals"
ON public.renewals FOR UPDATE
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can delete their own renewals"
ON public.renewals FOR DELETE
USING (auth.uid() = user_id AND public.is_authorized());

-- ============================================
-- RENEWAL_FILES TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view their own renewal files" ON public.renewal_files;
DROP POLICY IF EXISTS "Users can create their own renewal files" ON public.renewal_files;
DROP POLICY IF EXISTS "Users can delete their own renewal files" ON public.renewal_files;

CREATE POLICY "Authorized users can view their own renewal files"
ON public.renewal_files FOR SELECT
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can create their own renewal files"
ON public.renewal_files FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can delete their own renewal files"
ON public.renewal_files FOR DELETE
USING (auth.uid() = user_id AND public.is_authorized());

-- ============================================
-- TASKS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

CREATE POLICY "Authorized users can view their own tasks"
ON public.tasks FOR SELECT
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can create their own tasks"
ON public.tasks FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can update their own tasks"
ON public.tasks FOR UPDATE
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can delete their own tasks"
ON public.tasks FOR DELETE
USING (auth.uid() = user_id AND public.is_authorized());

-- ============================================
-- TASK_TAGS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view task tags" ON public.task_tags;
DROP POLICY IF EXISTS "Task owners can add tags on their tasks" ON public.task_tags;
DROP POLICY IF EXISTS "Task owners can delete tags on their tasks" ON public.task_tags;

CREATE POLICY "Authorized users can view task tags"
ON public.task_tags FOR SELECT
USING (
  public.is_authorized() AND (
    created_by = auth.uid() 
    OR tagged_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    OR EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_tags.task_id AND t.user_id = auth.uid())
  )
);

CREATE POLICY "Authorized task owners can add tags on their tasks"
ON public.task_tags FOR INSERT
WITH CHECK (
  public.is_authorized() AND
  created_by = auth.uid() AND
  EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_tags.task_id AND t.user_id = auth.uid())
);

CREATE POLICY "Authorized task owners can delete tags on their tasks"
ON public.task_tags FOR DELETE
USING (
  public.is_authorized() AND
  EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_tags.task_id AND t.user_id = auth.uid())
);

-- ============================================
-- TASK_HISTORY TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view task history for accessible tasks" ON public.task_history;
DROP POLICY IF EXISTS "Users can insert their own task history" ON public.task_history;

CREATE POLICY "Authorized users can view task history for accessible tasks"
ON public.task_history FOR SELECT
USING (
  public.is_authorized() AND (
    user_id = auth.uid()
    OR task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
    OR task_id IN (SELECT task_id FROM task_tags WHERE tagged_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)
  )
);

CREATE POLICY "Authorized users can insert their own task history"
ON public.task_history FOR INSERT
WITH CHECK (user_id = auth.uid() AND public.is_authorized());

-- ============================================
-- TASK_DELEGATION_RESPONSES TABLE
-- ============================================
DROP POLICY IF EXISTS "Task owners can view delegation responses" ON public.task_delegation_responses;

CREATE POLICY "Authorized task owners can view delegation responses"
ON public.task_delegation_responses FOR SELECT
USING (
  public.is_authorized() AND
  EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_delegation_responses.task_id AND t.user_id = auth.uid())
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications for themselves" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

CREATE POLICY "Authorized users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can create notifications for themselves"
ON public.notifications FOR INSERT
WITH CHECK (user_id = auth.uid() AND public.is_authorized());

CREATE POLICY "Authorized users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id AND public.is_authorized());

-- ============================================
-- PROFILES TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Authorized users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id AND public.is_authorized());

-- ============================================
-- AUDIT_LOG TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view their own audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Users can create their own audit log entries" ON public.audit_log;

CREATE POLICY "Authorized users can view their own audit log"
ON public.audit_log FOR SELECT
USING (auth.uid() = user_id AND public.is_authorized());

CREATE POLICY "Authorized admins can view all audit logs"
ON public.audit_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) AND public.is_authorized());

CREATE POLICY "Authorized users can create their own audit log entries"
ON public.audit_log FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_authorized());