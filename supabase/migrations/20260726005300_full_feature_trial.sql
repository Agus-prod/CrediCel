-- The free trial demonstrates the complete product while retaining strict
-- time and capacity limits (14 days, 50 customers, 1 branch, 5 users).
update public.subscription_plans
set
  description = '14 días para probar todas las funciones de CrediCel con una tienda y hasta 50 clientes.',
  limits = '{"branches":1,"users":5,"customers":50,"applications_monthly":50}'::jsonb,
  features = '{"credit":true,"inventory":true,"payments":true,"collections":true,"reports":true,"advanced_audit":true,"priority_support":true,"legal_templates":true,"device_protection":true}'::jsonb,
  trial_days = 14,
  monthly_price = 0,
  annual_price = 0,
  status = 'active'
where code = 'trial';
