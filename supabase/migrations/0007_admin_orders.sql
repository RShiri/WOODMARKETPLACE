-- =============================================================================
-- BrickCase — Admin Order Visibility
-- orders previously had no admin SELECT policy at all — an admin account
-- could only see orders it happened to own as a customer. Status *writes*
-- deliberately still go through the service-role client in
-- lib/orders/service.ts (app/admin/orders/actions.ts re-checks role there
-- too), consistent with orders having no authenticated UPDATE policy by
-- design elsewhere in this schema.
-- =============================================================================

create policy "orders_select_admin"
  on orders for select
  to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "order_items_select_admin"
  on order_items for select
  to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
