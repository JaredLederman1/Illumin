import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  Transaction,
  InvestmentsHoldingsGetResponse,
  InvestmentsTransactionsGetResponse,
} from 'plaid'
import { PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV } from '@/lib/env'

const resolvedEnv = PLAID_ENV as keyof typeof PlaidEnvironments
if (!PlaidEnvironments[resolvedEnv]) {
  console.warn(`[plaid] PLAID_ENV is "${PLAID_ENV}" which is not a valid Plaid environment. Falling back to sandbox.`)
}

const configuration = new Configuration({
  basePath: PlaidEnvironments[resolvedEnv] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
    },
  },
})

export const plaidClient = new PlaidApi(configuration)

export async function createLinkToken(userId: string): Promise<string> {
  const redirectUri = process.env.PLAID_REDIRECT_URI
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'Illumin',
    products: [Products.Transactions],
    optional_products: [Products.Investments],
    country_codes: [CountryCode.Us],
    language: 'en',
    ...(redirectUri ? { redirect_uri: redirectUri } : {}),
  })
  return response.data.link_token
}

export async function exchangePublicToken(
  publicToken: string
): Promise<{ accessToken: string; itemId: string }> {
  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  })
  return {
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  }
}

export async function getAccounts(accessToken: string) {
  const response = await plaidClient.accountsGet({
    access_token: accessToken,
  })
  return response.data.accounts
}

export async function getTransactions(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<Transaction[]> {
  const allTransactions: Transaction[] = []
  let offset = 0
  let total = Infinity

  while (allTransactions.length < total) {
    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: { offset, count: 500 },
    })
    const { transactions, total_transactions } = response.data
    total = total_transactions
    allTransactions.push(...transactions)
    offset += transactions.length
    if (transactions.length === 0) break
  }

  return allTransactions
}

export async function syncAccountBalances(accessToken: string) {
  const response = await plaidClient.accountsGet({
    access_token: accessToken,
  })
  return response.data.accounts
}

export async function getHoldings(accessToken: string): Promise<InvestmentsHoldingsGetResponse> {
  const response = await plaidClient.investmentsHoldingsGet({
    access_token: accessToken,
  })
  return response.data
}

export async function getInvestmentHoldings(accessToken: string) {
  const response = await plaidClient.investmentsHoldingsGet({
    access_token: accessToken,
  })
  return {
    holdings: response.data.holdings,
    securities: response.data.securities,
  }
}

export async function getInvestmentTransactions(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<InvestmentsTransactionsGetResponse> {
  const response = await plaidClient.investmentsTransactionsGet({
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
  })
  return response.data
}
