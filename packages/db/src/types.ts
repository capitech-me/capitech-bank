/**
 * Database types — hand-authored to mirror the Supabase migrations.
 * Regenerate from `supabase gen types typescript` once migrations are applied.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          country: string;
          base_currency: string;
          timezone: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<{
          id: string;
          slug: string;
          name: string;
          country: string;
          base_currency: string;
          timezone: string;
          settings: Json;
        }>;
        Update: Partial<{
          slug: string;
          name: string;
          country: string;
          base_currency: string;
          timezone: string;
          settings: Json;
        }>;
      };
      profiles: {
        Row: {
          id: string;
          tenant_id: string;
          role: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          email_notifications: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<{
          id: string;
          tenant_id: string;
          role: string;
          first_name: string;
          last_name: string;
          phone: string;
          avatar_url: string;
          email_notifications: boolean;
        }>;
        Update: Partial<{
          role: string;
          first_name: string;
          last_name: string;
          phone: string;
          avatar_url: string;
          email_notifications: boolean;
        }>;
      };
      customers: {
        Row: {
          id: string;
          tenant_id: string;
          profile_id: string;
          customer_no: string;
          customer_type: "retail" | "corporate";
          kyc_level: string;
          kyc_status: string;
          legal_first_name: string | null;
          legal_last_name: string | null;
          date_of_birth: string | null;
          nationality: string | null;
          country_of_residence: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          occupation: string | null;
          source_of_funds: string | null;
          is_pep: boolean;
          is_sanctioned: boolean;
          risk_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          profile_id: string;
          customer_type: string;
          legal_first_name: string;
          legal_last_name: string;
          date_of_birth: string;
          nationality: string;
          country_of_residence: string;
          address_line1: string;
          city: string;
          state: string;
          postal_code: string;
          occupation: string;
          source_of_funds: string;
          is_pep: boolean;
          is_sanctioned: boolean;
        }>;
        Update: Partial<{
          kyc_level: string;
          kyc_status: string;
          legal_first_name: string;
          legal_last_name: string;
          date_of_birth: string;
          nationality: string;
          country_of_residence: string;
          address_line1: string;
          address_line2: string;
          city: string;
          state: string;
          postal_code: string;
          occupation: string;
          source_of_funds: string;
          is_pep: boolean;
          is_sanctioned: boolean;
          risk_score: number;
        }>;
      };
      organizations: {
        Row: {
          id: string;
          tenant_id: string;
          legal_name: string;
          trading_name: string | null;
          registration_number: string | null;
          tax_id: string | null;
          country_of_incorporation: string;
          entity_type: string | null;
          industry: string | null;
          website: string | null;
          address_line1: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          kyc_status: string;
          risk_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          legal_name: string;
          trading_name: string;
          registration_number: string;
          tax_id: string;
          country_of_incorporation: string;
          entity_type: string;
          industry: string;
          website: string;
          address_line1: string;
          city: string;
          state: string;
          postal_code: string;
          kyc_status: string;
          risk_score: number;
        }>;
        Update: Partial<{
          legal_name: string;
          trading_name: string;
          registration_number: string;
          tax_id: string;
          country_of_incorporation: string;
          entity_type: string;
          industry: string;
          website: string;
          address_line1: string;
          city: string;
          state: string;
          postal_code: string;
          kyc_status: string;
          risk_score: number;
        }>;
      };
      organization_members: {
        Row: {
          id: string;
          tenant_id: string;
          organization_id: string;
          profile_id: string;
          role_title: string;
          is_signatory: boolean;
          approval_threshold: number | null;
          status: string;
          created_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          organization_id: string;
          profile_id: string;
          role_title: string;
          is_signatory: boolean;
          approval_threshold: number;
          status: string;
        }>;
        Update: Partial<{
          role_title: string;
          is_signatory: boolean;
          approval_threshold: number;
          status: string;
        }>;
      };
      kyc_documents: {
        Row: {
          id: string;
          tenant_id: string;
          customer_id: string | null;
          organization_id: string | null;
          document_type: string;
          file_path: string;
          status: string;
          verified_by: string | null;
          verified_at: string | null;
          rejection_reason: string | null;
          created_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          customer_id: string;
          organization_id: string;
          document_type: string;
          file_path: string;
          status: string;
        }>;
        Update: Partial<{
          status: string;
          verified_by: string;
          verified_at: string;
          rejection_reason: string;
        }>;
      };
      coa_accounts: {
        Row: {
          id: string;
          tenant_id: string;
          code: string;
          name: string;
          category: string;
          normal_side: string;
          currency: string | null;
          is_system: boolean;
          active: boolean;
          created_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          code: string;
          name: string;
          category: string;
          normal_side: string;
          currency: string;
          is_system: boolean;
          active: boolean;
        }>;
        Update: Partial<{
          name: string;
          category: string;
          normal_side: string;
          currency: string;
          active: boolean;
        }>;
      };
      gl_entries: {
        Row: {
          id: string;
          tenant_id: string;
          journal_no: string;
          entry_date: string;
          post_date: string | null;
          description: string;
          reference_type: string | null;
          reference_id: string | null;
          status: string;
          created_by: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          journal_no: string;
          entry_date: string;
          description: string;
          reference_type: string;
          reference_id: string;
          status: string;
          created_by: string;
          approved_by: string;
          approved_at: string;
        }>;
        Update: Partial<{
          status: string;
          approved_by: string;
          approved_at: string;
          post_date: string;
        }>;
      };
      gl_entry_lines: {
        Row: {
          id: string;
          tenant_id: string;
          entry_id: string;
          coa_account_id: string;
          currency: string;
          debit: string | null;
          credit: string | null;
          memo: string | null;
          created_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          entry_id: string;
          coa_account_id: string;
          currency: string;
          debit: string;
          credit: string;
          memo: string;
        }>;
        Update: Record<string, never>;
      };
      balances: {
        Row: {
          id: string;
          tenant_id: string;
          account_id: string;
          currency: string;
          ledger_balance: string;
          available_balance: string;
          last_transaction_at: string | null;
          updated_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          account_id: string;
          currency: string;
          ledger_balance: string;
          available_balance: string;
        }>;
        Update: Partial<{
          ledger_balance: string;
          available_balance: string;
          last_transaction_at: string;
        }>;
      };
      fx_rates: {
        Row: {
          id: string;
          tenant_id: string;
          base_currency: string;
          quote_currency: string;
          rate: string;
          source: string;
          valid_from: string;
          created_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          base_currency: string;
          quote_currency: string;
          rate: string;
          source: string;
          valid_from: string;
        }>;
        Update: Partial<{
          rate: string;
          source: string;
        }>;
      };
      products: {
        Row: {
          id: string;
          tenant_id: string;
          code: string;
          name: string;
          product_type: string;
          currency: string | null;
          description: string | null;
          interest_rate: string | null;
          min_opening_balance: string | null;
          max_balance: string | null;
          monthly_fee: string | null;
          daily_transfer_limit: string | null;
          min_term_days: number | null;
          max_term_days: number | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          code: string;
          name: string;
          product_type: string;
          currency: string;
          description: string;
          interest_rate: string;
          min_opening_balance: string;
          max_balance: string;
          monthly_fee: string;
          daily_transfer_limit: string;
          min_term_days: number;
          max_term_days: number;
          status: string;
        }>;
        Update: Partial<{
          name: string;
          description: string;
          interest_rate: string;
          min_opening_balance: string;
          max_balance: string;
          monthly_fee: string;
          daily_transfer_limit: string;
          min_term_days: number;
          max_term_days: number;
          status: string;
        }>;
      };
      accounts: {
        Row: {
          id: string;
          tenant_id: string;
          account_no: string;
          iban: string | null;
          swift_bic: string | null;
          product_id: string;
          owner_type: "customer" | "organization";
          owner_id: string;
          currency: string;
          status: string;
          nickname: string | null;
          daily_transfer_limit: string | null;
          frozen: boolean;
          opened_at: string;
          closed_at: string | null;
          created_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          account_no: string;
          iban: string;
          swift_bic: string;
          product_id: string;
          owner_type: string;
          owner_id: string;
          currency: string;
          status: string;
          nickname: string;
          daily_transfer_limit: string;
          frozen: boolean;
          opened_at: string;
        }>;
        Update: Partial<{
          status: string;
          nickname: string;
          daily_transfer_limit: string;
          frozen: boolean;
          closed_at: string;
        }>;
      };
      payment_orders: {
        Row: {
          id: string;
          tenant_id: string;
          order_no: string;
          tx_type: string;
          status: string;
          amount: string;
          currency: string;
          from_account_id: string | null;
          to_account_id: string | null;
          to_iban: string | null;
          to_bic: string | null;
          to_beneficiary_name: string | null;
          fee_amount: string | null;
          fee_currency: string | null;
          reference: string | null;
          narration: string | null;
          created_by: string;
          approved_by: string | null;
          approved_at: string | null;
          executed_at: string | null;
          failure_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          order_no: string;
          tx_type: string;
          status: string;
          amount: string;
          currency: string;
          from_account_id: string;
          to_account_id: string;
          to_iban: string;
          to_bic: string;
          to_beneficiary_name: string;
          fee_amount: string;
          fee_currency: string;
          reference: string;
          narration: string;
          created_by: string;
          approved_by: string;
          approved_at: string;
          executed_at: string;
          failure_reason: string;
        }>;
        Update: Partial<{
          status: string;
          approved_by: string;
          approved_at: string;
          executed_at: string;
          failure_reason: string;
        }>;
      };
      cards: {
        Row: {
          id: string;
          tenant_id: string;
          account_id: string;
          customer_id: string;
          brand: string;
          last4: string;
          token: string;
          exp_month: number;
          exp_year: number;
          status: string;
          name_on_card: string | null;
          daily_limit: string | null;
          monthly_limit: string | null;
          online_enabled: boolean;
          atm_enabled: boolean;
          contactless_enabled: boolean;
          frozen: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          account_id: string;
          customer_id: string;
          brand: string;
          last4: string;
          token: string;
          exp_month: number;
          exp_year: number;
          status: string;
          name_on_card: string;
          daily_limit: string;
          monthly_limit: string;
          online_enabled: boolean;
          atm_enabled: boolean;
          contactless_enabled: boolean;
          frozen: boolean;
        }>;
        Update: Partial<{
          status: string;
          name_on_card: string;
          daily_limit: string;
          monthly_limit: string;
          online_enabled: boolean;
          atm_enabled: boolean;
          contactless_enabled: boolean;
          frozen: boolean;
        }>;
      };
      card_transactions: {
        Row: {
          id: string;
          tenant_id: string;
          card_id: string;
          tx_type: string;
          amount: string;
          currency: string;
          merchant_name: string | null;
          merchant_category: string | null;
          mcc: string | null;
          status: string;
          country: string | null;
          created_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          card_id: string;
          tx_type: string;
          amount: string;
          currency: string;
          merchant_name: string;
          merchant_category: string;
          mcc: string;
          status: string;
          country: string;
        }>;
        Update: Partial<{ status: string }>;
      };
      deposits: {
        Row: {
          id: string;
          tenant_id: string;
          account_id: string;
          customer_id: string;
          product_id: string;
          principal: string;
          currency: string;
          interest_rate: string;
          term_days: number;
          start_date: string;
          maturity_date: string;
          interest_accrued: string;
          rollover: boolean;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          account_id: string;
          customer_id: string;
          product_id: string;
          principal: string;
          currency: string;
          interest_rate: string;
          term_days: number;
          start_date: string;
          maturity_date: string;
          interest_accrued: string;
          rollover: boolean;
          status: string;
        }>;
        Update: Partial<{
          interest_accrued: string;
          rollover: boolean;
          status: string;
        }>;
      };
      notifications: {
        Row: {
          id: string;
          tenant_id: string;
          profile_id: string;
          type: string;
          title: string;
          body: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          profile_id: string;
          type: string;
          title: string;
          body: string;
          read: boolean;
        }>;
        Update: Partial<{ read: boolean }>;
      };
      operation_logs: {
        Row: {
          id: string;
          tenant_id: string;
          actor_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          details: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          actor_id: string;
          action: string;
          entity_type: string;
          entity_id: string;
          details: Json;
          ip_address: string;
        }>;
        Update: Record<string, never>;
      };
      api_keys: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          key_hash: string;
          key_prefix: string;
          scopes: string[];
          status: string;
          last_used_at: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          name: string;
          key_hash: string;
          key_prefix: string;
          scopes: string[];
          status: string;
          expires_at: string;
        }>;
        Update: Partial<{
          status: string;
          last_used_at: string;
        }>;
      };
      crypto_wallets: {
        Row: {
          id: string;
          tenant_id: string;
          account_id: string;
          asset: string;
          balance: string;
          address: string | null;
          created_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          account_id: string;
          asset: string;
          balance: string;
          address: string;
        }>;
        Update: Partial<{ balance: string }>;
      };
      crypto_orders: {
        Row: {
          id: string;
          tenant_id: string;
          account_id: string;
          order_type: string;
          asset: string;
          side: string;
          amount_fiat: string | null;
          amount_asset: string | null;
          price: string | null;
          status: string;
          created_at: string;
        };
        Insert: Partial<{
          tenant_id: string;
          account_id: string;
          order_type: string;
          asset: string;
          side: string;
          amount_fiat: string;
          amount_asset: string;
          price: string;
          status: string;
        }>;
        Update: Partial<{ status: string }>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
