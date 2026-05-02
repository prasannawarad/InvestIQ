-- InvestIQ mock data seed for Supabase
-- Run this after files/01_supabase_schema_rls.sql in the Supabase SQL editor.
--
-- Demo auth details:
--   Email login: priya.sharma@example.com
--   Password: InvestIQDemo123!
--   Linked Google identity: priya.sharma@example.com
--
-- Note: this creates a mock Google identity row for local/demo testing. In a
-- real Supabase project, Google OAuth must also be configured in
-- Authentication > Providers, and the real provider subject will be created by
-- Supabase when the user signs in with Google.

create extension if not exists pgcrypto;

do $$
declare
  priya_user_id uuid := '11111111-1111-4111-8111-111111111111';
  priya_email text := 'priya.sharma@example.com';
  priya_password text := 'InvestIQDemo123!';
  v_portfolio_id uuid := '22222222-2222-4222-8222-222222222222';
  v_market_context_id uuid := '33333333-3333-4333-8333-333333333333';
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    priya_user_id,
    'authenticated',
    'authenticated',
    priya_email,
    crypt(priya_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email","google"]}'::jsonb,
    '{"name":"Priya Sharma","full_name":"Priya Sharma","avatar_url":null}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  on conflict (id) do update
  set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = now();

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values
    (
      priya_user_id,
      priya_user_id,
      priya_user_id::text,
      jsonb_build_object(
        'sub', priya_user_id::text,
        'email', priya_email,
        'email_verified', true,
        'phone_verified', false,
        'name', 'Priya Sharma',
        'full_name', 'Priya Sharma'
      ),
      'email',
      now(),
      now(),
      now()
    ),
    (
      '44444444-4444-4444-8444-444444444444'::uuid,
      priya_user_id,
      'google-priya-sharma-demo',
      jsonb_build_object(
        'sub', 'google-priya-sharma-demo',
        'email', priya_email,
        'email_verified', true,
        'name', 'Priya Sharma',
        'full_name', 'Priya Sharma',
        'avatar_url', null,
        'provider_id', 'google-priya-sharma-demo'
      ),
      'google',
      now(),
      now(),
      now()
    )
  on conflict (provider_id, provider) do update
  set
    user_id = excluded.user_id,
    identity_data = excluded.identity_data,
    updated_at = now();

  insert into public.profiles (
    id,
    app_user_id,
    version,
    name,
    age,
    occupation,
    location,
    currency,
    financial_context,
    risk_profile,
    preferences,
    extensions,
    created_at,
    updated_at
  )
  values (
    priya_user_id,
    'u_001',
    '1.0',
    'Priya Sharma',
    38,
    'Schoolteacher',
    'Dallas, Texas, USA',
    'USD',
    '{
      "annual_income": 62000,
      "monthly_savings_capacity": 500,
      "dependents": 2,
      "existing_liabilities": [
        { "type": "student_loan", "outstanding": 12000, "monthly_payment": 210 }
      ],
      "emergency_fund_months": 3
    }'::jsonb,
    '{
      "persona": "balanced",
      "persona_label": "Balanced",
      "risk_score": 5,
      "risk_capacity": "medium",
      "risk_tolerance": "medium",
      "loss_comfort": "uncomfortable_below_15_percent"
    }'::jsonb,
    '{
      "communication_tone": "friendly_simple",
      "explanation_depth": "beginner",
      "notification_frequency": "weekly",
      "preferred_language": "english"
    }'::jsonb,
    '{"tax":{},"esg":{},"behavioral":{},"ai_memory":{}}'::jsonb,
    '2026-05-01T09:00:00Z',
    '2026-05-01T09:00:00Z'
  )
  on conflict (id) do update
  set
    app_user_id = excluded.app_user_id,
    version = excluded.version,
    name = excluded.name,
    age = excluded.age,
    occupation = excluded.occupation,
    location = excluded.location,
    currency = excluded.currency,
    financial_context = excluded.financial_context,
    risk_profile = excluded.risk_profile,
    preferences = excluded.preferences,
    extensions = excluded.extensions,
    updated_at = excluded.updated_at;

  insert into public.goals (
    id,
    user_id,
    external_goal_id,
    name,
    target_amount,
    current_progress,
    target_date,
    priority,
    flexibility,
    created_at,
    updated_at
  )
  values
    (
      '55555555-5555-4555-8555-555555555551',
      priya_user_id,
      'g_001',
      'House down payment',
      45000,
      9000,
      '2029-06-01',
      'high',
      'low',
      '2026-05-01T09:00:00Z',
      '2026-05-01T09:00:00Z'
    ),
    (
      '55555555-5555-4555-8555-555555555552',
      priya_user_id,
      'g_002',
      'Retirement',
      650000,
      18000,
      '2052-01-01',
      'high',
      'medium',
      '2026-05-01T09:00:00Z',
      '2026-05-01T09:00:00Z'
    )
  on conflict (user_id, external_goal_id) do update
  set
    name = excluded.name,
    target_amount = excluded.target_amount,
    current_progress = excluded.current_progress,
    target_date = excluded.target_date,
    priority = excluded.priority,
    flexibility = excluded.flexibility,
    updated_at = excluded.updated_at;

  insert into public.portfolios (
    id,
    user_id,
    external_portfolio_id,
    version,
    as_of,
    currency,
    summary,
    allocation,
    risk_metrics,
    extensions,
    created_at,
    updated_at
  )
  values (
    v_portfolio_id,
    priya_user_id,
    'p_001',
    '1.0',
    '2026-05-01T09:00:00Z',
    'USD',
    '{
      "total_value": 5000,
      "total_invested": 4800,
      "total_returns": 200,
      "returns_percent": 4.17,
      "day_change_value": -12,
      "day_change_percent": -0.24,
      "health_score": 78
    }'::jsonb,
    '{
      "by_asset_class": { "equity": 65, "debt": 25, "gold": 5, "cash": 5 },
      "by_geography": { "USA": 100 },
      "target_allocation": { "equity": 60, "debt": 30, "gold": 5, "cash": 5 },
      "drift_from_target": 5
    }'::jsonb,
    '{
      "portfolio_beta": 0.86,
      "portfolio_volatility": 12.4,
      "sharpe_ratio": 0.78,
      "max_drawdown_1y": -6.1,
      "concentration_risk": "low",
      "diversification_score": 82
    }'::jsonb,
    '{"tax_lots":[],"transactions":[],"dividends":[],"sip_schedules":[],"alerts":[]}'::jsonb,
    '2026-05-01T09:00:00Z',
    '2026-05-01T09:00:00Z'
  )
  on conflict (user_id, external_portfolio_id) do update
  set
    version = excluded.version,
    as_of = excluded.as_of,
    currency = excluded.currency,
    summary = excluded.summary,
    allocation = excluded.allocation,
    risk_metrics = excluded.risk_metrics,
    extensions = excluded.extensions,
    updated_at = excluded.updated_at;

  delete from public.holdings where portfolio_id = v_portfolio_id;

  insert into public.holdings (
    id,
    portfolio_id,
    user_id,
    external_holding_id,
    symbol,
    name,
    asset_class,
    subcategory,
    sector,
    quantity,
    avg_buy_price,
    current_price,
    current_value,
    unrealized_pnl,
    unrealized_pnl_percent,
    weight_in_portfolio,
    metadata,
    created_at,
    updated_at
  )
  values
    ('66666666-6666-4666-8666-666666666601', v_portfolio_id, priya_user_id, 'h_001', 'AAPL', 'Apple Inc.', 'equity', 'large_cap', 'technology', 1.94, 165, 180.56, 350, 27, 8.36, 7, '{"purchase_date":"2025-02-10","exchange":"NASDAQ","location":"USA"}'::jsonb, '2026-05-01T09:00:00Z', '2026-05-01T09:00:00Z'),
    ('66666666-6666-4666-8666-666666666602', v_portfolio_id, priya_user_id, 'h_002', 'MSFT', 'Microsoft Corporation', 'equity', 'large_cap', 'technology', 0.84, 405, 417.91, 350, 10, 2.94, 7, '{"purchase_date":"2025-03-12","exchange":"NASDAQ","location":"USA"}'::jsonb, '2026-05-01T09:00:00Z', '2026-05-01T09:00:00Z'),
    ('66666666-6666-4666-8666-666666666603', v_portfolio_id, priya_user_id, 'h_003', 'GOOGL', 'Alphabet Inc.', 'equity', 'large_cap', 'communication_services', 1.75, 162, 171.23, 300, 16, 5.63, 6, '{"purchase_date":"2025-04-08","exchange":"NASDAQ","location":"USA"}'::jsonb, '2026-05-01T09:00:00Z', '2026-05-01T09:00:00Z'),
    ('66666666-6666-4666-8666-666666666604', v_portfolio_id, priya_user_id, 'h_004', 'JNJ', 'Johnson & Johnson', 'equity', 'large_cap', 'healthcare', 2.15, 153, 162.79, 350, 20, 6.06, 7, '{"purchase_date":"2024-11-18","exchange":"NYSE","location":"USA"}'::jsonb, '2026-05-01T09:00:00Z', '2026-05-01T09:00:00Z'),
    ('66666666-6666-4666-8666-666666666605', v_portfolio_id, priya_user_id, 'h_005', 'PG', 'Procter & Gamble Company', 'equity', 'large_cap', 'consumer_staples', 2.09, 158, 167.46, 350, 19, 5.74, 7, '{"purchase_date":"2024-12-02","exchange":"NYSE","location":"USA"}'::jsonb, '2026-05-01T09:00:00Z', '2026-05-01T09:00:00Z'),
    ('66666666-6666-4666-8666-666666666606', v_portfolio_id, priya_user_id, 'h_006', 'JPM', 'JPMorgan Chase & Co.', 'equity', 'large_cap', 'financials', 1.54, 212, 227.27, 350, 22, 6.71, 7, '{"purchase_date":"2025-01-07","exchange":"NYSE","location":"USA"}'::jsonb, '2026-05-01T09:00:00Z', '2026-05-01T09:00:00Z'),
    ('66666666-6666-4666-8666-666666666607', v_portfolio_id, priya_user_id, 'h_007', 'COST', 'Costco Wholesale Corporation', 'equity', 'large_cap', 'consumer_staples', 0.34, 835, 892.86, 300, 18, 6.38, 6, '{"purchase_date":"2025-02-24","exchange":"NASDAQ","location":"USA"}'::jsonb, '2026-05-01T09:00:00Z', '2026-05-01T09:00:00Z'),
    ('66666666-6666-4666-8666-666666666608', v_portfolio_id, priya_user_id, 'h_008', 'NEE', 'NextEra Energy, Inc.', 'equity', 'large_cap', 'utilities', 4.69, 61, 63.94, 300, 13, 4.53, 6, '{"purchase_date":"2025-03-01","exchange":"NYSE","location":"USA"}'::jsonb, '2026-05-01T09:00:00Z', '2026-05-01T09:00:00Z'),
    ('66666666-6666-4666-8666-666666666609', v_portfolio_id, priya_user_id, 'h_009', 'VZ', 'Verizon Communications Inc.', 'equity', 'large_cap', 'communication_services', 7.5, 38, 40, 300, 14, 4.9, 6, '{"purchase_date":"2024-10-15","exchange":"NYSE","location":"USA"}'::jsonb, '2026-05-01T09:00:00Z', '2026-05-01T09:00:00Z'),
    ('66666666-6666-4666-8666-666666666610', v_portfolio_id, priya_user_id, 'h_010', 'XOM', 'Exxon Mobil Corporation', 'equity', 'large_cap', 'energy', 2.74, 104, 109.38, 300, 13, 4.53, 6, '{"purchase_date":"2025-01-22","exchange":"NYSE","location":"USA"}'::jsonb, '2026-05-01T09:00:00Z', '2026-05-01T09:00:00Z'),
    ('66666666-6666-4666-8666-666666666611', v_portfolio_id, priya_user_id, 'h_011', 'BND', 'Vanguard Total Bond Market ETF', 'debt', 'bond_etf', 'fixed_income', 17.01, 72, 73.49, 1250, 20, 1.63, 25, '{"expense_ratio":0.03,"duration_years":6.1,"exchange":"NASDAQ","location":"USA"}'::jsonb, '2026-05-01T09:00:00Z', '2026-05-01T09:00:00Z'),
    ('66666666-6666-4666-8666-666666666612', v_portfolio_id, priya_user_id, 'h_012', 'GLD', 'SPDR Gold Shares', 'gold', 'gold_etf', 'commodities', 1.0, 242, 250, 250, 8, 3.31, 5, '{"expense_ratio":0.4,"exchange":"NYSE Arca","location":"USA"}'::jsonb, '2026-05-01T09:00:00Z', '2026-05-01T09:00:00Z'),
    ('66666666-6666-4666-8666-666666666613', v_portfolio_id, priya_user_id, 'h_013', 'VMFXX', 'Vanguard Federal Money Market Fund', 'cash', 'money_market', 'cash_equivalent', 250, 1, 1, 250, 0, 0, 5, '{"location":"USA"}'::jsonb, '2026-05-01T09:00:00Z', '2026-05-01T09:00:00Z');

  insert into public.market_contexts (
    id,
    external_market_context_id,
    as_of,
    market_snapshot,
    macro_context,
    extensions,
    created_at,
    updated_at
  )
  values (
    v_market_context_id,
    'mc_001',
    '2026-05-01T09:00:00Z',
    '{
      "indices": [
        { "symbol": "SPX", "name": "S&P 500", "value": 5750, "day_change_percent": -0.32 },
        { "symbol": "IXIC", "name": "Nasdaq Composite", "value": 18325, "day_change_percent": -0.48 },
        { "symbol": "DJI", "name": "Dow Jones Industrial Average", "value": 42100, "day_change_percent": -0.18 }
      ],
      "sentiment": "cautious",
      "volatility_regime": "moderate"
    }'::jsonb,
    '{"interest_rate":4.75,"inflation_rate":3.1,"gdp_growth_estimate":2.2}'::jsonb,
    '{"sector_performance":{},"news_feed":[]}'::jsonb,
    '2026-05-01T09:00:00Z',
    '2026-05-01T09:00:00Z'
  )
  on conflict (external_market_context_id) do update
  set
    as_of = excluded.as_of,
    market_snapshot = excluded.market_snapshot,
    macro_context = excluded.macro_context,
    extensions = excluded.extensions,
    updated_at = excluded.updated_at;

  delete from public.market_events where market_context_id = v_market_context_id;

  insert into public.market_events (
    id,
    market_context_id,
    external_event_id,
    headline,
    category,
    impact,
    relevance_to_user,
    plain_summary,
    created_at,
    updated_at
  )
  values
    (
      '77777777-7777-4777-8777-777777777771',
      v_market_context_id,
      'e_001',
      'Federal Reserve leaves rates unchanged as inflation cools slowly',
      'monetary_policy',
      'neutral',
      'high',
      'The Fed held interest rates steady, which is generally calm news for Priya''s bond fund and cash-like savings.',
      '2026-05-01T09:00:00Z',
      '2026-05-01T09:00:00Z'
    ),
    (
      '77777777-7777-4777-8777-777777777772',
      v_market_context_id,
      'e_002',
      'Large U.S. technology stocks slip after a cautious earnings outlook',
      'earnings',
      'negative',
      'moderate',
      'Some of Priya''s technology holdings may move down a little today, but they are only part of a diversified portfolio.',
      '2026-05-01T09:00:00Z',
      '2026-05-01T09:00:00Z'
    );
end $$;

select
  profiles.id as user_uuid,
  profiles.name,
  portfolios.summary ->> 'total_value' as total_value_usd,
  count(holdings.id) as holding_count
from public.profiles
join public.portfolios on portfolios.user_id = profiles.id
join public.holdings on holdings.portfolio_id = portfolios.id
where profiles.id = '11111111-1111-4111-8111-111111111111'
group by profiles.id, profiles.name, portfolios.summary;
