-- Premium B2B positioning: annual billing remains equivalent to ten months.
update public.subscription_plans
set monthly_price = 1999, annual_price = 19990,
    description = 'Operación completa para tiendas que están profesionalizando su cartera de crédito.'
where code = 'small';

update public.subscription_plans
set monthly_price = 4999, annual_price = 49990,
    description = 'Control multitienda, mayor volumen, documentos y trazabilidad avanzada.'
where code = 'medium';

update public.subscription_plans
set monthly_price = 12999, annual_price = 129990,
    description = 'Infraestructura para cadenas con operación intensiva, control avanzado y atención prioritaria.'
where code = 'large';
